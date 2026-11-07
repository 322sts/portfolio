// Événement d'ouverture de la palette (bouton d'en-tête → CommandPalette montée dans le layout).
export const PALETTE_OPEN_EVENT = "portfolio:palette-open";

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(PALETTE_OPEN_EVENT));
}
