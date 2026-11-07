export { renderMarkdown } from "./render";
// Ne PAS réexporter sanitizeSvg ici : il charge isomorphic-dompurify → jsdom,
// qui plantait sur Vercel (ERR_REQUIRE_ESM) dès qu'une page publique importait
// le rendu Markdown. L'admin l'importe directement depuis @/lib/security/sanitize-svg.
