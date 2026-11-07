import { defineRouting } from "next-intl/routing";

/**
 * Routage i18n (SPEC §3) : `fr` par défaut sans préfixe, `en` sous `/en`.
 * Les clés de `pathnames` sont les chemins internes (= noms des dossiers
 * sous `src/app/[locale]`, en français) ; les valeurs, les URL publiques.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  // Langue mémorisée dans un cookie, mais pas de redirection automatique
  // d'après Accept-Language : l'URL sans préfixe reste toujours en français.
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/projets": { fr: "/projets", en: "/projects" },
    "/projets/[slug]": { fr: "/projets/[slug]", en: "/projects/[slug]" },
    "/a-propos": { fr: "/a-propos", en: "/about" },
    "/contact": { fr: "/contact", en: "/contact" },
    "/connexion": { fr: "/connexion", en: "/login" },
    "/inscription": { fr: "/inscription", en: "/register" },
    "/compte": { fr: "/compte", en: "/account" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
