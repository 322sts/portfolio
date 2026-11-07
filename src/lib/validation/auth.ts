import { z } from "zod";

/** Email normalisé (minuscules, sans espaces) — utilisé partout comme identifiant. */
export const emailSchema = z
  .string({ error: "errors.required" })
  .trim()
  .toLowerCase()
  .min(1, { error: "errors.required" })
  .max(254, { error: "errors.invalidEmail" })
  .pipe(z.email({ error: "errors.invalidEmail" }));

/** Mot de passe à l'inscription : 10 à 128 caractères (SPEC §5). */
export const newPasswordSchema = z
  .string({ error: "errors.required" })
  .min(10, { error: "errors.passwordLength" })
  .max(128, { error: "errors.passwordLength" });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, { error: "errors.nameLength" })
    .optional()
    .transform((v) => (v ? v : undefined)),
  email: emailSchema,
  password: newPasswordSchema,
});

/**
 * Connexion : on ne révèle pas la règle de longueur (message générique),
 * on borne seulement la taille pour éviter de hacher des chaînes énormes.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "errors.required" }).min(1, { error: "errors.required" }).max(128, { error: "auth.invalidCredentials" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
