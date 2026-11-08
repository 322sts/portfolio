import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Dimension } from "@/components/dimension/Dimension";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Icon } from "@/components/icons/Icon";
import { plateNumberLabel } from "@/components/plate/Plate";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { sheetFor } from "@/components/site-header/nav-items";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { Link } from "@/lib/i18n/navigation";
import { getPublishedProjects } from "@/lib/queries/projects";
import { getDomainCounts, getPublicProfile } from "@/lib/queries/site";
import { PersonJsonLd } from "./_components/PersonJsonLd";
import { asLocale, categoryCode, pageMetadata } from "./_lib/seo";
import styles from "./home.module.css";

type Props = { params: Promise<{ locale: string }> };

const LATEST_COUNT = 3;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const [t, tm] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "metadata" }),
  ]);
  return pageMetadata({
    locale,
    href: "/",
    title: { absolute: tm("defaultTitle") },
    description: t("metaDescription"),
    type: "profile",
  });
}

function latestDate(dates: Array<Date | null | undefined>): Date | null {
  const valid = dates.filter((d): d is Date => d instanceof Date);
  return valid.length ? new Date(Math.max(...valid.map((d) => d.getTime()))) : null;
}

export default async function HomePage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  // Requêtes séquentielles : la base locale (prisma dev) n'accepte qu'une connexion.
  const projects = await getPublishedProjects(locale);
  const domains = await getDomainCounts(locale);
  const profile = await getPublicProfile(locale);
  const [t, tn, tm] = await Promise.all([
    getTranslations("home"),
    getTranslations("nav"),
    getTranslations("metadata"),
  ]);

  const latest = projects.slice(0, LATEST_COUNT);
  const years = projects.map((p) => p.date.getUTCFullYear());
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const lastPlate = Math.max(0, ...projects.map((p) => p.plateNumber));
  const span = projects.length
    ? t("span", {
        last: plateNumberLabel(lastPlate),
        years: minYear === maxYear ? String(minYear) : `${minYear}–${maxYear}`,
      })
    : t("spanEmpty");
  const revision = latestDate([profile.updatedAt, ...projects.map((p) => p.updatedAt)]);

  return (
    <main id="contenu" className={styles.home}>
      <PersonJsonLd
        locale={locale}
        jobTitle={t("subtitle")}
        description={tm("description")}
        websiteName={tm("defaultTitle")}
        sameAs={[profile.linkedinUrl, profile.githubUrl]}
        photoUrl={profile.photoUrl}
        knowsAbout={domains.map((d) => d.name)}
      />
      <section className={styles.masthead} aria-labelledby="titre-accueil">
        <p className={`mono-caps ${styles.kicker}`}>{t("sheetLabel")}</p>
        <div className={styles.nameBlock}>
          <Dimension value={span} tone="mark" className={styles.dimension} />
          <h1 id="titre-accueil" className={styles.name}>
            <span>Alban</span> <span>Grelaud</span>
          </h1>
        </div>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <p className={styles.interests}>{t("interests")}</p>
        {profile.bio ? (
          <p className={styles.bio} lang={profile.bioLocale === locale ? undefined : profile.bioLocale}>
            {profile.bio}
          </p>
        ) : null}
        <ul role="list" className={styles.links} aria-label={t("links")}>
          <li>
            <a href={profile.githubUrl} rel="me noopener noreferrer" className={styles.link}>
              GitHub <Icon name="arrowUpRight" size={14} />
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} rel="me noopener noreferrer" className={styles.link}>
              LinkedIn <Icon name="arrowUpRight" size={14} />
            </a>
          </li>
          <li>
            <Link href="/a-propos" className={styles.link}>
              {t("aboutLink")} <Icon name="arrowRight" size={14} />
            </Link>
          </li>
          <li>
            <Link href="/contact" className={styles.link}>
              {t("contactLink")} <Icon name="arrowRight" size={14} />
            </Link>
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="titre-planches">
        <div className={styles.sectionHead}>
          <h2 id="titre-planches">{t("latest")}</h2>
          {projects.length ? (
            <Link href="/projets" className={styles.more}>
              {t("allProjects", { count: projects.length })} <Icon name="arrowRight" size={14} />
            </Link>
          ) : null}
        </div>
        <p className={styles.sectionIntro}>{t("latestIntro")}</p>
        {latest.length ? (
          <PlateGrid projects={latest} headingLevel={3} label={t("latest")} />
        ) : (
          <EmptyState title={t("noProjects")} />
        )}
      </section>

      <section className={styles.section} aria-labelledby="titre-domaines">
        <div className={styles.sectionHead}>
          <h2 id="titre-domaines">{t("domains")}</h2>
        </div>
        <p className={styles.sectionIntro}>{t("domainsIntro")}</p>
        <table className={styles.survey}>
          <caption className="sr-only">{t("domainsCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("domainCode")}</th>
              <th scope="col">{t("domainName")}</th>
              <th scope="col">{t("domainCount")}</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.slug} data-empty={d.count === 0 ? "" : undefined}>
                <td className={styles.code}>{categoryCode(d.slug)}</td>
                <th scope="row" className={styles.domain}>
                  {d.name}
                </th>
                <td className={styles.count}>
                  <span className={styles.ticks} aria-hidden="true">
                    {Array.from({ length: Math.min(d.count, 12) }, (_, i) => (
                      <span key={i} className={styles.tick} />
                    ))}
                  </span>
                  {d.count > 0 ? (
                    <Link
                      href={{ pathname: "/projets", query: { cat: d.slug } }}
                      aria-label={`${t("domainCountValue", { count: d.count })} — ${t("domainLink", { name: d.name })}`}
                    >
                      {t("domainCountValue", { count: d.count })}
                    </Link>
                  ) : (
                    <span className={styles.pending}>{t("domainEmpty")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <TitleBlock title={tn("home")} sheet={sheetFor("home")} revision={revision} />
    </main>
  );
}
