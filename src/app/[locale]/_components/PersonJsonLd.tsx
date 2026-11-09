import { getPathname } from "@/lib/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/routing";

/**
 * Données structurées schema.org (JSON-LD) de la page d'accueil : WebSite + ProfilePage
 * dont l'entité principale est la Person « Alban Grelaud ». Aide Google à relier le site
 * au nom et aux profils (sameAs). À valider sur https://search.google.com/test/rich-results
 */

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const SCHOOL = { name: "IMT Nord Europe", url: "https://imt-nord-europe.fr" };

type Props = {
  locale: AppLocale;
  /** Intitulé (ex. « Élève-ingénieur à IMT Nord Europe »). */
  jobTitle: string;
  description: string;
  /** Nom court du site (« Alban Grelaud ») : Google l'affiche comme nom du site. */
  siteName: string;
  /** Titre long (« Alban Grelaud — Portfolio »), donné en nom alternatif. */
  websiteName: string;
  sameAs: string[];
  photoUrl: string | null;
  knowsAbout: string[];
};

export function PersonJsonLd({ locale, jobTitle, description, siteName, websiteName, sameAs, photoUrl, knowsAbout }: Props) {
  const homeUrl = siteUrl + getPathname({ locale, href: "/" });
  const personId = `${siteUrl}/#person`;
  const websiteId = `${siteUrl}/#website`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${siteUrl}/`,
        // Nom de site affiché par Google (au lieu de « Vercel ») : court, sans slogan.
        name: siteName,
        alternateName: [websiteName, "A. Grelaud"],
        inLanguage: ["fr", "en"],
        publisher: { "@id": personId },
      },
      {
        "@type": "ProfilePage",
        "@id": `${homeUrl}#profilepage`,
        url: homeUrl,
        name: websiteName,
        inLanguage: locale,
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: "Alban Grelaud",
        givenName: "Alban",
        familyName: "Grelaud",
        url: `${siteUrl}/`,
        jobTitle,
        description,
        ...(photoUrl ? { image: new URL(photoUrl, `${siteUrl}/`).toString() } : {}),
        // `affiliation` et non `alumniOf` : élève en cours de scolarité, pas diplômé.
        affiliation: { "@type": "EducationalOrganization", ...SCHOOL },
        ...(knowsAbout.length ? { knowsAbout } : {}),
        sameAs: sameAs.filter(Boolean),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // `<` échappé : empêche toute fermeture prématurée du <script> (XSS).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
