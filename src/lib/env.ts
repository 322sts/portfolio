import "server-only";
import { z } from "zod";

/**
 * Lecture et validation des variables d'environnement côté serveur (SPEC §1 et §5).
 * Les services tiers sont optionnels : une chaîne vide est traitée comme « absent »
 * pour permettre la dégradation gracieuse en dev.
 */

// "" → undefined, pour que `.optional()` fonctionne avec un .env aux valeurs vides.
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.email().optional(),
);

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET est obligatoire (npx auth secret)"),
  AUTH_GITHUB_ID: optionalString,
  AUTH_GITHUB_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  CONTACT_TO_EMAIL: optionalEmail,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  ADMIN_EMAIL: optionalEmail,
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.replace(/\/$/, "") : undefined),
    z.url().default("http://localhost:3000"),
  ),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")} : ${i.message}`)
      .join("\n");
    throw new Error(`Variables d'environnement invalides :\n${details}`);
  }
  return parsed.data;
}

export const env = parseEnv();

/** Clés de test Cloudflare Turnstile (toujours valides), dev uniquement. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** Disponibilité des services optionnels : à utiliser plutôt que de tester les variables à la main. */
export const features = {
  githubOAuth: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  resend: Boolean(env.RESEND_API_KEY),
  cloudinary: Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  ),
  turnstile: Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
} as const;

/**
 * Clés Turnstile effectives : vraies clés si présentes, sinon clés de test en dev.
 * En production sans clés → null (l'appelant doit refuser l'envoi).
 */
export function getTurnstileKeys(): { siteKey: string; secretKey: string } | null {
  if (env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY) {
    return { siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, secretKey: env.TURNSTILE_SECRET_KEY };
  }
  if (env.NODE_ENV !== "production") {
    return { siteKey: TURNSTILE_TEST_SITE_KEY, secretKey: TURNSTILE_TEST_SECRET_KEY };
  }
  return null;
}

/** Destinataire des messages de contact (repli : email admin). */
export const contactToEmail = env.CONTACT_TO_EMAIL ?? env.ADMIN_EMAIL ?? "albangrelaud@proton.me";
