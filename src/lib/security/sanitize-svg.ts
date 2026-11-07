import "server-only";
import DOMPurify from "isomorphic-dompurify";

/**
 * Assainit un SVG de planche (SPEC §5) avec DOMPurify, profil SVG.
 * Retire : <script>, <foreignObject>, <style> (CSS injectable si le SVG est un jour
 * inséré dans le DOM), <iframe>/<embed>/<object>, tous les gestionnaires on*,
 * et toute référence (href / xlink:href) qui n'est pas une ancre interne "#id".
 * Renvoie "" si le résultat n'est pas un SVG.
 * À appeler à l'enregistrement ; le rendu passe ensuite par <img src="data:image/svg+xml,…">.
 */

const MAX_SVG_LENGTH = 500_000;

let hookInstalled = false;

function installHook(): void {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    const name = data.attrName.toLowerCase();
    if (name === "href" || name === "xlink:href") {
      // Uniquement des références internes (dégradés, <use href="#id">).
      if (!data.attrValue.trim().startsWith("#")) data.keepAttr = false;
    }
    // url(...) externes dans les attributs de présentation (fill="url(http://…)").
    if (/url\(\s*['"]?\s*(?!#)/i.test(data.attrValue)) data.keepAttr = false;
  });
}

export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || svg.length === 0 || svg.length > MAX_SVG_LENGTH) return "";
  installHook();
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "style", "iframe", "embed", "object", "a"],
    // L'attribut style est gardé (exports Inkscape/Figma) ; ses url() externes sont retirés par le hook.
    ALLOW_DATA_ATTR: false,
  });
  const trimmed = clean.trim();
  return /^<svg[\s>]/i.test(trimmed) ? trimmed : "";
}

/** URL data: prête pour <img src> (le navigateur n'exécute aucun script dans ce contexte). */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
