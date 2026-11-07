import "server-only";
import { getTurnstileKeys } from "@/lib/env";
import { HONEYPOT_FIELD } from "./form-fields";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Vérification serveur du jeton Turnstile. Fermé par défaut : clés absentes en prod,
 * jeton manquant, réseau en panne ou réponse invalide → false.
 * Hors prod sans clés, les clés de test Cloudflare (toujours valides) sont utilisées.
 */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const keys = getTurnstileKeys();
  if (!keys) return false;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const body = new URLSearchParams({ secret: keys.secretKey, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] vérification impossible", e);
    return false;
  }
}

/** true si le champ piège a été rempli (robot). */
export function isHoneypotFilled(formData: FormData): boolean {
  const v = formData.get(HONEYPOT_FIELD);
  return typeof v === "string" && v.trim().length > 0;
}

/** Clé publique à transmettre au widget (null en prod sans configuration). */
export function getTurnstileSiteKey(): string | null {
  return getTurnstileKeys()?.siteKey ?? null;
}
