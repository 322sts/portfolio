/**
 * IP du client derrière Vercel : Vercel écrase `x-forwarded-for` avec la vraie IP
 * (le client ne peut pas l'usurper) ; on prend le premier élément, puis `x-real-ip`.
 * Hors Vercel (dev), la valeur peut être absente → "unknown" (une seule clé partagée).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const ip = first || headers.get("x-real-ip")?.trim() || "";
  // Borne la taille et filtre les caractères : la valeur sert de clé en BDD.
  const clean = ip.slice(0, 64).replace(/[^0-9a-fA-F:.]/g, "");
  return clean || "unknown";
}
