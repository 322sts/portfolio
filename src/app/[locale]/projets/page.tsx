import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { FilterBar } from "@/components/filter-bar/FilterBar";
import { filtersToQuery } from "@/components/filter-bar/query";
import { buttonClassName } from "@/components/form";
import { Nomenclature } from "@/components/nomenclature/Nomenclature";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { sheetFor } from "@/components/site-header/nav-items";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { ViewSwitch } from "@/components/view-switch/ViewSwitch";
import { Link } from "@/lib/i18n/navigation";
import { getFilterOptions, getPublishedProjects } from "@/lib/queries/projects";
import { parseProjectFilters, type RawSearchParams } from "@/lib/validation/project-filters";
import { asLocale, pageMetadata } from "../_lib/seo";
import styles from "./projects.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "projects" });
  const meta = await pageMetadata({ locale, href: "/projets", title: t("title"), description: t("metaDescription") });
  // Les combinaisons de filtres ne sont pas indexées (canonical = liste complète).
  const filtered = Object.keys(filtersToQuery(parseProjectFilters(await searchParams))).length > 0;
  return filtered ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const filters = parseProjectFilters(await searchParams);

  // Séquentiel : une seule connexion en dev (prisma dev).
  const projects = await getPublishedProjects(locale, filters);
  const options = await getFilterOptions(locale);
  const [t, tn] = await Promise.all([getTranslations("projects"), getTranslations("nav")]);

  const revision = projects.length
    ? new Date(Math.max(...projects.map((p) => p.updatedAt.getTime())))
    : null;

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">
          {tn("sheet")} 02 · {tn("projects")}
        </p>
        <h1>{t("title")}</h1>
        <p className={styles.intro}>{t("intro")}</p>
      </header>

      <div className={styles.controls}>
        <FilterBar options={options} filters={filters} resultCount={projects.length} />
        <div className={styles.view}>
          <ViewSwitch filters={filters} />
        </div>
      </div>

      <div className={styles.results}>
        {projects.length === 0 ? (
          <EmptyState
            title={t("empty")}
            action={
              <Link
                href={{ pathname: "/projets", query: filtersToQuery({ vue: filters.vue }) }}
                className={buttonClassName({ variant: "secondary", size: "sm" })}
              >
                {t("resetFilters")}
              </Link>
            }
          >
            {t("emptyHint")}
          </EmptyState>
        ) : filters.vue === "nomenclature" ? (
          <Nomenclature projects={projects} />
        ) : (
          <PlateGrid projects={projects} headingLevel={2} />
        )}
      </div>

      <TitleBlock title={tn("projects")} sheet={sheetFor("projects")} revision={revision} />
    </main>
  );
}
