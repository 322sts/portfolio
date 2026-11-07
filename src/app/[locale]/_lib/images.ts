/**
 * Images de projet : seules les images Cloudinary (déclarées dans images.remotePatterns)
 * et les fichiers locaux passent par l'optimiseur de next/image. Une URL collée à la main
 * (admin sans Cloudinary) est rendue sans optimisation plutôt que de faire échouer la page ;
 * la CSP (img-src) reste le garde-fou final.
 */
export function isOptimizableImage(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
