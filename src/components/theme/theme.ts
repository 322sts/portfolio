// Préférence de thème partagée serveur / client (aucune dépendance serveur ici).

export const THEME_COOKIE = "theme";
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function parseThemePreference(value: string | undefined | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Valeur de l'attribut data-theme sur <html> (absent = suivre le système). */
export function themeAttribute(pref: ThemePreference): "light" | "dark" | undefined {
  return pref === "system" ? undefined : pref;
}

/** Événement émis sur window quand le thème change (palette ↔ bascule restent synchronisées). */
export const THEME_EVENT = "portfolio:theme";
