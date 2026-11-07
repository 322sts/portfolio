import type { StaticPathname } from "./MainNav";

/**
 * Séquence des feuilles de la navigation principale (FEUILLE 01–04).
 * C'est le vrai ordre du jeu de plans : TitleBlock, palette et pied de page s'en servent.
 */
export const MAIN_SHEETS = [
  { href: "/", key: "home", number: 1 },
  { href: "/projets", key: "projects", number: 2 },
  { href: "/a-propos", key: "about", number: 3 },
  { href: "/contact", key: "contact", number: 4 },
] as const satisfies ReadonlyArray<{ href: StaticPathname; key: string; number: number }>;

export const SHEET_TOTAL = MAIN_SHEETS.length;

export type MainSheetKey = (typeof MAIN_SHEETS)[number]["key"];

/** Numéro de feuille (pour le cartouche) d'une page principale. */
export function sheetFor(key: MainSheetKey): { number: number; total: number } {
  const s = MAIN_SHEETS.find((m) => m.key === key);
  return { number: s?.number ?? 0, total: SHEET_TOTAL };
}
