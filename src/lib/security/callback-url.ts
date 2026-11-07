/**
 * Validation anti open-redirect d'un `callbackUrl` : uniquement un chemin relatif
 * de la même origine (commence par "/" mais ni "//" ni "/" suivi d'un antislash),
 * sans caractère de contrôle. Renvoie le chemin normalisé (pathname + search + hash)
 * ou `fallback`.
 */
export function safeCallbackUrl(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // Antislash (certains navigateurs le lisent comme "/") et caractères de contrôle.
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const base = "http://local.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    // Pas de retour vers les routes techniques (boucles, endpoints).
    if (url.pathname.startsWith("/api/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
