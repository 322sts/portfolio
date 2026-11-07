import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/lib/i18n/navigation";
import { routing, type AppLocale } from "@/lib/i18n/routing";

/**
 * Métadonnées communes des pages publiques (agent 4) : title, description, canonical,
 * alternates hreflang fr/en (+ x-default = fr), Open Graph. Les URL sont relatives :
 * `metadataBase` (layout [locale]) les rend absolues. L'image OG vient du fichier
 * `opengraph-image.tsx` du segment [locale].
 */

export type Href = Parameters<typeof getPathname>[0]["href"];

export function asLocale(value: string): AppLocale {
  return (routing.locales as readonly string[]).includes(value) ? (value as AppLocale) : routing.defaultLocale;
}

export function localizedUrls(href: Href, locale: AppLocale) {
  const url = (l: AppLocale) => getPathname({ locale: l, href });
  return {
    canonical: url(locale),
    languages: {
      fr: url("fr"),
      en: url("en"),
      "x-default": url(routing.defaultLocale),
    },
  };
}

type Options = {
  locale: AppLocale;
  href: Href;
  /** Titre de la page (le gabarit « %s — Alban Grelaud » du layout s'applique), ou absolu. */
  title: string | { absolute: string };
  description: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
};

export async function pageMetadata({ locale, href, title, description, type = "website", noIndex }: Options): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  const alternates = localizedUrls(href, locale);
  // Image OG explicite : un openGraph défini par la page masquerait sinon celle du fichier
  // opengraph-image.tsx du segment (comportement de fusion de Next). URL sans préfixe /fr.
  const image = {
    url: locale === routing.defaultLocale ? "/opengraph-image" : `/${locale}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: t("defaultTitle"),
  };
  const ogTitle = typeof title === "string" ? `${title} — ${t("siteName")}` : title.absolute;
  return {
    title,
    description,
    alternates,
    openGraph: {
      type,
      siteName: t("siteName"),
      title: ogTitle,
      description,
      url: alternates.canonical,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      alternateLocale: locale === "fr" ? ["en_GB"] : ["fr_FR"],
      images: [image],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [image] },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Code court d'une catégorie pour les repères (FIN, MAT, INF, IA…). */
export function categoryCode(slug: string): string {
  const known: Record<string, string> = { finance: "FIN", maths: "MAT", info: "INF", ia: "IA" };
  return known[slug] ?? slug.slice(0, 3).toUpperCase();
}
