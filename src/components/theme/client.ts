"use client";

import { THEME_COOKIE, THEME_EVENT, themeAttribute, type ThemePreference } from "./theme";

/**
 * Applique un thème sans rechargement : cookie (1 an, lu par le serveur au prochain rendu)
 * + attribut data-theme sur <html> + événement pour synchroniser les autres contrôles.
 */
export function applyTheme(pref: ThemePreference): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax${secure}`;
  const attr = themeAttribute(pref);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
  window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_EVENT, { detail: pref }));
}
