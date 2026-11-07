import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getPathname } from "@/lib/i18n/navigation";
import { routing, type AppLocale, type AppPathname } from "@/lib/i18n/routing";

// Généré à la demande (pas au build) : évite d'exiger la BDD pendant `next build`.
export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

type Href = Parameters<typeof getPathname>[0]["href"];

function entry(href: Href, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const url = (locale: AppLocale) => siteUrl + getPathname({ locale, href });
  return {
    url: url(routing.defaultLocale),
    lastModified,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
    },
  };
}

const STATIC_PAGES: AppPathname[] = ["/", "/projets", "/a-propos", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = STATIC_PAGES.map((p) => entry(p as Href));

  let projects: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    projects = await db.project.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
  } catch (error) {
    console.error("[sitemap] lecture des projets impossible", error);
  }

  return [
    ...pages,
    ...projects.map((p) =>
      entry({ pathname: "/projets/[slug]", params: { slug: p.slug } }, p.updatedAt),
    ),
  ];
}
