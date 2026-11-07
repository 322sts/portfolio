// Recherche floue simple, sans dépendance : sous-chaîne d'abord, puis sous-séquence.

/** Minuscules sans diacritiques (« Électricité » → « electricite »). */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Score de correspondance (plus grand = meilleur), ou -1 si aucune.
 * - sous-chaîne : 1000 − position (bonus si début de mot) ;
 * - sous-séquence : 500 − écarts cumulés entre lettres trouvées.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const t = normalize(target);
  const idx = t.indexOf(q);
  if (idx !== -1) {
    const wordStart = idx === 0 || /[\s\-—·.:/]/.test(t[idx - 1]);
    return 1000 - idx + (wordStart ? 200 : 0);
  }
  let ti = 0;
  let gaps = 0;
  let last = -1;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    if (last !== -1) gaps += found - last - 1;
    last = found;
    ti = found + 1;
  }
  return Math.max(1, 500 - gaps * 10);
}
