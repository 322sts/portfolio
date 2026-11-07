import type { z } from "zod";

/**
 * Contrat de retour des Server Actions ADMIN (SPEC §5) :
 * `{ ok: true, data } | { ok: false, error, fieldErrors? }`.
 * L'admin est hors i18n (FR en dur) : contrairement à `ActionResult` (clés i18n),
 * `error` et `fieldErrors` contiennent ici directement le texte français à afficher.
 */
export type AdminFieldErrors = Record<string, string>;

export type AdminResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: AdminFieldErrors };

export function ok<T>(data: T): AdminResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: AdminFieldErrors): { ok: false; error: string; fieldErrors?: AdminFieldErrors } {
  return fieldErrors && Object.keys(fieldErrors).length ? { ok: false, error, fieldErrors } : { ok: false, error };
}

/**
 * Erreurs Zod → une erreur par champ. Le chemin complet est conservé avec des points
 * (ex. `fr.title`, `media.2.altEn`) pour cibler les champs imbriqués.
 */
export function zodFieldErrors(error: z.ZodError): AdminFieldErrors {
  const out: AdminFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError) {
  return fail("Certains champs sont invalides : corrigez-les puis réessayez.", zodFieldErrors(error));
}

/** Message générique en cas d'erreur inattendue (jamais de détail interne côté client). */
export const UNEXPECTED = "Une erreur inattendue est survenue. Réessayez ; si elle persiste, consultez les logs du serveur.";
