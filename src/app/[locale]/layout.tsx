import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { routing, type AppLocale } from "@/lib/i18n/routing";
import { getPublishedProjects } from "@/lib/queries/projects";
import { CommandPalette, type PaletteProject } from "@/components/command-palette/CommandPalette";
import { Frame } from "@/components/frame/Frame";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { SiteHeader } from "@/components/site-header/SiteHeader";
import { SkipLink } from "@/components/skip-link/SkipLink";
import { getThemePreference } from "@/components/theme/server";
import { themeAttribute } from "@/components/theme/theme";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.css";

// Layout racine PUBLIC (html lang=locale). Le layout admin est un second layout racine.
// Rendu TOUJOURS dynamique : la lecture du cookie de thème (cookies()) l'impose, ce qui est
// voulu — la CSP à nonce de src/proxy.ts n'est posée que sur les pages rendues à la requête.
// Pas de generateStaticParams ici pour la même raison.

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("defaultTitle"), template: `%s — ${t("siteName")}` },
    description: t("description"),
    verification: { google: "HIcqexzEGEE5FcWGgiWQDtcxCWG0-TjbFdnf1hDnnZ0" },
  };
}

/** Projets de la palette ; une base indisponible ne doit pas casser toutes les pages. */
async function paletteProjects(locale: AppLocale): Promise<PaletteProject[]> {
  try {
    const projects = await getPublishedProjects(locale);
    return projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      plateNumber: p.plateNumber,
      hint: [...p.categories.map((c) => c.name), ...p.technologies.map((t) => t.name)].join(" "),
    }));
  } catch (error) {
    console.error("[layout] palette : projets indisponibles", error);
    return [];
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [theme, session, projects, t] = await Promise.all([
    getThemePreference(),
    auth(),
    paletteProjects(locale),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  return (
    <html
      lang={locale}
      className={fontVariables}
      data-theme={themeAttribute(theme)}
      data-scroll-behavior="smooth"
    >
      <body>
        <NextIntlClientProvider>
          <SkipLink label={t("skipToContent")} />
          <Frame>
            <SiteHeader theme={theme} user={session ? { name: session.user.name } : null} />
            <div className="page">{children}</div>
            <SiteFooter />
          </Frame>
          <CommandPalette projects={projects} isAuthenticated={Boolean(session)} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
