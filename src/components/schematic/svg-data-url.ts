/**
 * Encode un SVG (DÉJÀ sanitisé côté serveur, cf. src/lib/security) en data URL
 * pour <Schematic customSvgDataUrl>. N'effectue AUCUNE sanitisation.
 */
export function svgToDataUrl(sanitizedSvg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizedSvg)}`;
}
