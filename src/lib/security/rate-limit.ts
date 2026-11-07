import "server-only";
import { db } from "@/lib/db";

/**
 * Limitation de débit adossée à la table LoginAttempt (SPEC §5).
 * Conventions de clés :
 *   - `email:<email>` / `ip:<ip>`  → tentatives de connexion (success true/false)
 *   - `register:<ip>`              → inscriptions soumises
 *   - `contact:<ip>`               → messages de contact soumis
 * (Les commentaires sont limités en comptant directement la table Comment.)
 */

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
const RETENTION_MS = 24 * HOUR_MS;

export const loginKeys = {
  email: (email: string) => `email:${email.trim().toLowerCase()}`,
  ip: (ip: string) => `ip:${ip}`,
};

/** Nettoyage opportuniste (environ 1 appel sur 20) des lignes de plus de 24 h. */
async function maybeCleanup(): Promise<void> {
  if (Math.random() > 0.05) return;
  try {
    await db.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });
  } catch (e) {
    console.error("[rate-limit] nettoyage impossible", e);
  }
}

/**
 * Échecs récents pour une clé. Pour la clé email, un succès remet le compteur à zéro
 * (seuls les échecs postérieurs au dernier succès comptent). Pas pour l'IP : un
 * attaquant ne doit pas pouvoir « réinitialiser » son IP en se connectant à son propre compte.
 */
async function recentFailures(key: string, resetOnSuccess: boolean): Promise<number> {
  let since = new Date(Date.now() - LOGIN_WINDOW_MS);
  if (resetOnSuccess) {
    const lastSuccess = await db.loginAttempt.findFirst({
      where: { key, success: true, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastSuccess) since = lastSuccess.createdAt;
  }
  return db.loginAttempt.count({ where: { key, success: false, createdAt: { gt: since } } });
}

/** true si l'email OU l'IP a atteint 5 échecs dans les 15 dernières minutes. */
export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const [byEmail, byIp] = await Promise.all([
    recentFailures(loginKeys.email(email), true),
    recentFailures(loginKeys.ip(ip), false),
  ]);
  return byEmail >= LOGIN_MAX_FAILURES || byIp >= LOGIN_MAX_FAILURES;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  await db.loginAttempt.createMany({
    data: [
      { key: loginKeys.email(email), success },
      { key: loginKeys.ip(ip), success },
    ],
  });
  await maybeCleanup();
}

/** true si `key` a déjà `max` actions dans la fenêtre (lecture seule). */
export async function isQuotaExceeded(key: string, max: number, windowMs: number): Promise<boolean> {
  const count = await db.loginAttempt.count({
    where: { key, createdAt: { gt: new Date(Date.now() - windowMs) } },
  });
  return count >= max;
}

/** Enregistre une action consommant le quota de `key`. */
export async function recordQuotaUse(key: string): Promise<void> {
  await db.loginAttempt.create({ data: { key, success: true } });
  await maybeCleanup();
}
