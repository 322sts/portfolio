import type { z } from "zod";
import type messages from "../../../messages/fr.json";

/**
 * Contrat de retour de toutes les Server Actions (SPEC §5).
 * `error` et les valeurs de `fieldErrors` sont des CLÉS i18n (ex. "errors.required"),
 * jamais du texte en dur : le client les traduit avec `useTranslations()`.
 */
type M = typeof messages;
type KeysOf<NS extends keyof M> = `${NS & string}.${keyof M[NS] & string}`;

/** Clés de messages utilisables comme erreur d'action. */
export type ErrorKey = KeysOf<"errors"> | KeysOf<"auth"> | KeysOf<"contact"> | KeysOf<"account">;

export type FieldErrors = Partial<Record<string, ErrorKey>>;

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorKey; fieldErrors?: FieldErrors };

/** État initial pour `useActionState` (aucune soumission encore). */
export type FormState<T = null> = ActionResult<T> | null;

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: ErrorKey, fieldErrors?: FieldErrors): { ok: false; error: ErrorKey; fieldErrors?: FieldErrors } {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

const FALLBACK: ErrorKey = "errors.invalidField";

/** Les schémas Zod portent des clés i18n comme messages ; tout autre message devient une clé générique. */
function asErrorKey(message: string): ErrorKey {
  return /^(errors|auth|contact|account)\.[A-Za-z]+$/.test(message) ? (message as ErrorKey) : FALLBACK;
}

/** Première erreur par champ, au format clé i18n. */
export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_form");
    if (!out[field]) out[field] = asErrorKey(issue.message);
  }
  return out;
}

/** Échec de validation standard. */
export function validationFailed(error: z.ZodError) {
  return fail("errors.validation", fieldErrorsFromZod(error));
}
