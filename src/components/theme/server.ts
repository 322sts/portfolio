import "server-only";
import { cookies } from "next/headers";
import { parseThemePreference, THEME_COOKIE, type ThemePreference } from "./theme";

/**
 * Lit la préférence de thème dans le cookie (côté serveur, pas de script anti-flash :
 * compatible avec la CSP à nonce). Rend la route dynamique.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  return parseThemePreference(store.get(THEME_COOKIE)?.value);
}
