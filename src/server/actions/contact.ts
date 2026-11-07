"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { contactToEmail, env, features } from "@/lib/env";
import { TURNSTILE_FIELD } from "@/lib/security/form-fields";
import { getClientIp } from "@/lib/security/ip";
import { HOUR_MS, isQuotaExceeded, recordQuotaUse } from "@/lib/security/rate-limit";
import { isHoneypotFilled, verifyTurnstile } from "@/lib/security/turnstile";
import { type ActionResult, fail, ok, validationFailed } from "@/lib/validation/action-result";
import { type ContactInput, contactSchema } from "@/lib/validation/contact";

const CONTACT_MAX_PER_HOUR = 3;
// Expéditeur de test Resend (pas de domaine vérifié sur *.vercel.app).
const RESEND_FROM = "Portfolio <onboarding@resend.dev>";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

async function notify(message: ContactInput): Promise<void> {
  if (!features.resend) {
    // Dégradation gracieuse (SPEC §1) : message déjà en BDD, simple log.
    console.info(`[contact] Resend absent — message de ${message.email} enregistré (« ${message.subject} »).`);
    return;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: contactToEmail,
    replyTo: message.email,
    subject: `[Portfolio] ${message.subject}`,
    // Texte brut uniquement : aucun HTML issu du visiteur.
    text: `De : ${message.name} <${message.email}>\n\n${message.body}`,
  });
  if (error) console.error("[contact] envoi Resend échoué", error.name);
}

export async function sendContactMessage(_prev: unknown, formData: FormData): Promise<ActionResult> {
  // Robot : on fait semblant que tout va bien, sans rien enregistrer.
  if (isHoneypotFilled(formData)) return ok(null);

  const parsed = contactSchema.safeParse({
    name: str(formData, "name"),
    email: str(formData, "email"),
    subject: str(formData, "subject"),
    body: str(formData, "body"),
  });
  if (!parsed.success) return validationFailed(parsed.error);

  const ip = getClientIp(await headers());
  const quotaKey = `contact:${ip}`;
  if (await isQuotaExceeded(quotaKey, CONTACT_MAX_PER_HOUR, HOUR_MS)) return fail("contact.rateLimited");
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) return fail("errors.antiBot");
  await recordQuotaUse(quotaKey);

  try {
    await db.contactMessage.create({ data: parsed.data });
  } catch (e) {
    console.error("[contact] enregistrement impossible", e);
    return fail("contact.error");
  }

  try {
    await notify(parsed.data);
  } catch (e) {
    // Le message est en BDD : l'admin le verra même si l'email échoue.
    console.error("[contact] notification impossible", e);
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return ok(null);
}
