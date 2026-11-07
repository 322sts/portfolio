"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { getPathname } from "@/lib/i18n/navigation";
import { safeCallbackUrl } from "@/lib/security/callback-url";
import { TURNSTILE_FIELD } from "@/lib/security/form-fields";
import { getClientIp } from "@/lib/security/ip";
import { hashPassword } from "@/lib/security/password";
import { HOUR_MS, isQuotaExceeded, recordQuotaUse } from "@/lib/security/rate-limit";
import { isHoneypotFilled, verifyTurnstile } from "@/lib/security/turnstile";
import { type ActionResult, fail, validationFailed } from "@/lib/validation/action-result";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

const REGISTER_MAX_PER_HOUR = 3;

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

/** Destination après connexion : callbackUrl validé (même origine) sinon /compte localisé. */
async function destination(formData: FormData): Promise<string> {
  const locale = await getLocale();
  const fallback = getPathname({ href: "/compte", locale });
  return safeCallbackUrl(str(formData, "callbackUrl"), fallback);
}

/** Connexion Credentials ; sur succès, `signIn` lève une redirection (NEXT_REDIRECT). */
async function signInWithCredentials(email: string, password: string, redirectTo: string): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof CredentialsSignin && e.code === "rate_limited") return fail("auth.tooManyAttempts");
    if (e instanceof AuthError) return fail("auth.invalidCredentials");
    throw e; // redirection Next : à laisser remonter
  }
  return fail("errors.generic");
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: str(formData, "email"), password: str(formData, "password") });
  if (!parsed.success) {
    // Champs vides : erreur par champ ; sinon message générique (ne rien révéler).
    const missing = parsed.error.issues.some((i) => i.message === "errors.required");
    return missing ? validationFailed(parsed.error) : fail("auth.invalidCredentials");
  }
  return signInWithCredentials(parsed.data.email, parsed.data.password, await destination(formData));
}

export async function register(_prev: unknown, formData: FormData): Promise<ActionResult> {
  // 1) Robot naïf : on ne lui donne aucun indice.
  if (isHoneypotFilled(formData)) return fail("errors.generic");

  const parsed = registerSchema.safeParse({
    name: str(formData, "name"),
    email: str(formData, "email"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return validationFailed(parsed.error);

  // 2) Quota 3 inscriptions / heure / IP, puis Turnstile.
  const ip = getClientIp(await headers());
  const quotaKey = `register:${ip}`;
  if (await isQuotaExceeded(quotaKey, REGISTER_MAX_PER_HOUR, HOUR_MS)) return fail("errors.rateLimited");
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) return fail("errors.antiBot");
  await recordQuotaUse(quotaKey);

  // 3) Création (rôle VISITOR par défaut, jamais choisi par le client).
  const { name, email, password } = parsed.data;
  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return fail("errors.validation", { email: "errors.emailTaken" });
  try {
    await db.user.create({
      data: { email, name: name ?? null, passwordHash: await hashPassword(password) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("errors.validation", { email: "errors.emailTaken" });
    }
    console.error("[register]", e);
    return fail("errors.generic");
  }

  // 4) Connexion automatique puis redirection vers /compte.
  return signInWithCredentials(email, password, await destination(formData));
}

/** Connexion GitHub (bouton affiché seulement si configuré). */
export async function loginWithGithub(formData: FormData): Promise<void> {
  if (!features.githubOAuth) return;
  await signIn("github", { redirectTo: await destination(formData) });
}

export async function logout(): Promise<void> {
  const locale = await getLocale();
  await signOut({ redirectTo: getPathname({ href: "/", locale }) });
}
