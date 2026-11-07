import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/badge/Badge";
import { buttonClassName } from "@/components/form";
import { Icon } from "@/components/icons/Icon";
import { Notice } from "@/components/notice/Notice";
import { formatPlateDate, plateNumberLabel } from "@/components/plate/Plate";
import { Prose } from "@/components/prose/Prose";
import { Schematic } from "@/components/schematic/Schematic";
import { svgToDataUrl } from "@/components/schematic/svg-data-url";
import { Sheet } from "@/components/sheet/Sheet";
import { SHEET_TOTAL } from "@/components/site-header/nav-items";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { auth } from "@/lib/auth";
import { getPathname, Link } from "@/lib/i18n/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getProjectBySlug } from "@/lib/queries/projects";
import { getApprovedComments, isFavorite } from "@/lib/queries/site";
import { asLocale, pageMetadata } from "../../_lib/seo";
import { CommentForm } from "./comment-form";
import { FavoriteButton } from "./favorite-button";
import { isOptimizableImage } from "../../_lib/images";
import styles from "./project.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  const project = await getProjectBySlug(locale, slug);
  if (!project) return {};
  return pageMetadata({
    locale,
    href: { pathname: "/projets/[slug]", params: { slug } },
    title: project.title,
    description: project.summary || project.title,
    type: "article",
  });
}

export default async function ProjectPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  // 404 propre : slug inconnu, mal formé ou projet non publié (getProjectBySlug ne lit que PUBLISHED).
  const project = await getProjectBySlug(locale, slug);
  if (!project) notFound();

  // Séquentiel : une seule connexion BDD en dev (prisma dev).
  const session = await auth();
  const favorited = session ? await isFavorite(session.user.id, project.id) : false;
  const comments = await getApprovedComments(project.id);

  const [t, format] = await Promise.all([getTranslations("projects"), getFormatter()]);
  const md = (src: string) => renderMarkdown(src, { locale });
  const [summaryEl, objectivesEl, bodyEl, resultsEl, aiMethodEl] = await Promise.all([
    md(project.summary),
    project.objectives?.trim() ? md(project.objectives) : null,
    project.body.trim() ? md(project.body) : null,
    project.results?.trim() ? md(project.results) : null,
    project.aiAssisted && project.aiMethod?.trim() ? md(project.aiMethod) : null,
  ]);

  const num = plateNumberLabel(project.plateNumber);
  const style = project.categories[0]?.schematicStyle ?? "generic";
  const isFallback = project.contentLocale !== locale;
  const contentLang = isFallback ? project.contentLocale : undefined;
  const selfPath = getPathname({ locale, href: { pathname: "/projets/[slug]", params: { slug } } });
  const dateIso = project.date.toISOString().slice(0, 10);
  const monthYear = format.dateTime(project.date, { month: "long", year: "numeric", timeZone: "UTC" });

  const images = [
    ...(project.coverImageUrl ? [{ id: "cover", url: project.coverImageUrl, alt: project.title, caption: null }] : []),
    ...project.media,
  ];

  return (
    <main id="contenu" className={styles.page}>
      <nav aria-label={t("backToList")} className={styles.back}>
        <Link href="/projets" className={styles.backLink}>
          <Icon name="arrowLeft" size={14} /> {t("backToList")}
        </Link>
      </nav>

      <header className={styles.head}>
        <p className={styles.plateLine}>
          <span className={styles.plateNum}>
            {t("plate")} {num}
          </span>
          {project.technologies[0] ? <span>{project.technologies[0].name}</span> : null}
          <span>{project.teamType === "TEAM" ? t("team") : t("solo")}</span>
        </p>
        <h1 className={styles.title} lang={contentLang}>
          {project.title}
        </h1>
        {project.aiAssisted ? (
          <p>
            <Badge tone="mark">{t("aiBadge")}</Badge>
          </p>
        ) : null}

        <dl className={styles.meta}>
          <div>
            <dt>{t("date")}</dt>
            <dd>
              <time dateTime={dateIso} title={monthYear}>
                {formatPlateDate(project.date)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{t("teamLabel")}</dt>
            <dd>{project.teamType === "TEAM" ? t("team") : t("solo")}</dd>
          </div>
          {project.technologies.length ? (
            <div>
              <dt>{t("technologies")}</dt>
              <dd>
                <ul role="list" className={styles.tags}>
                  {project.technologies.map((tech) => (
                    <li key={tech.slug}>
                      <Link href={{ pathname: "/projets", query: { tech: tech.slug } }}>{tech.name}</Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {project.categories.length ? (
            <div>
              <dt>{t("categories")}</dt>
              <dd>
                <ul role="list" className={styles.tags}>
                  {project.categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={{ pathname: "/projets", query: { cat: c.slug } }}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>

        <div className={styles.actions}>
          {project.githubUrl ? (
            <a href={project.githubUrl} className={buttonClassName({ variant: "secondary", size: "sm" })} rel="noopener noreferrer">
              {t("github")} <Icon name="arrowUpRight" size={14} />
            </a>
          ) : null}
          {project.demoUrl ? (
            <a href={project.demoUrl} className={buttonClassName({ variant: "secondary", size: "sm" })} rel="noopener noreferrer">
              {t("demo")} <Icon name="arrowUpRight" size={14} />
            </a>
          ) : null}
          {project.pdfUrl ? (
            <a href={project.pdfUrl} className={buttonClassName({ variant: "secondary", size: "sm" })} rel="noopener noreferrer">
              {t("pdf")} <Icon name="arrowUpRight" size={14} />
            </a>
          ) : null}
          {session ? (
            <FavoriteButton projectId={project.id} initialFavorited={favorited} />
          ) : (
            <Link
              href={{ pathname: "/connexion", query: { callbackUrl: selfPath } }}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              {t("favoriteLogin")}
            </Link>
          )}
        </div>
      </header>

      <figure className={styles.schematic}>
        <Schematic
          style={style}
          seed={project.slug}
          customSvgDataUrl={project.plateSvg ? svgToDataUrl(project.plateSvg) : null}
          title={t("schematic", { number: num, title: project.title })}
          showDimensions
        />
      </figure>

      {isFallback ? (
        <Notice tone="info">
          {t("fallbackNotice", { language: project.contentLocale === "en" ? t("languageEn") : t("languageFr") })}
        </Notice>
      ) : null}

      <Sheet stamp={t("stamp", { number: num })} aria-labelledby="enonce">
        <div lang={contentLang}>
          <Prose>
            <h2 id="enonce">{t("statement")}</h2>
            {summaryEl}
            {objectivesEl ? (
              <>
                <h2>{t("objectives")}</h2>
                {objectivesEl}
              </>
            ) : null}
            {bodyEl}
            {resultsEl ? (
              <>
                <h2>{t("results")}</h2>
                {resultsEl}
              </>
            ) : null}
            {aiMethodEl ? (
              <>
                <h2>{t("aiMethod")}</h2>
                {aiMethodEl}
              </>
            ) : null}
          </Prose>
        </div>
      </Sheet>

      {images.length ? (
        <section className={styles.section} aria-labelledby="medias">
          <h2 id="medias" className={styles.sectionTitle}>
            {t("media")}
          </h2>
          <div className={styles.media}>
            {images.map((m, i) => (
              <figure key={m.id} className={styles.mediaItem}>
                <div className={styles.mediaFrame}>
                  <Image
                    src={m.url}
                    alt={m.alt}
                    fill
                    sizes="(min-width: 1100px) 50vw, 100vw"
                    unoptimized={!isOptimizableImage(m.url)}
                    className={styles.mediaImg}
                  />
                </div>
                <figcaption className={styles.caption}>
                  <span className={styles.figNum}>{t("figure", { number: i + 1 })}</span>
                  {m.caption ? <span>{m.caption}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {project.prev || project.next ? (
        <nav aria-label={t("neighbours")} className={styles.neighbours}>
          {project.prev ? (
            <Link
              href={{ pathname: "/projets/[slug]", params: { slug: project.prev.slug } }}
              className={styles.neighbour}
              rel="prev"
            >
              <span className={styles.neighbourLabel}>
                <Icon name="arrowLeft" size={14} /> {t("prev")}
              </span>
              <span className={styles.neighbourTitle}>{project.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {project.next ? (
            <Link
              href={{ pathname: "/projets/[slug]", params: { slug: project.next.slug } }}
              className={`${styles.neighbour} ${styles.neighbourNext}`}
              rel="next"
            >
              <span className={styles.neighbourLabel}>
                {t("next")} <Icon name="arrowRight" size={14} />
              </span>
              <span className={styles.neighbourTitle}>{project.next.title}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}

      <section className={styles.section} aria-labelledby="commentaires">
        <h2 id="commentaires" className={styles.sectionTitle}>
          {t("comments")}
          {comments.length ? (
            <span className={styles.count}> · {t("commentCount", { count: comments.length })}</span>
          ) : null}
        </h2>
        {comments.length ? (
          <ol role="list" className={styles.comments}>
            {comments.map((c) => (
              <li key={c.id} className={styles.comment}>
                <p className={styles.commentMeta}>
                  <span>{c.authorName ?? t("commentAnonymous")}</span> ·{" "}
                  <time dateTime={c.createdAt.toISOString()}>{format.dateTime(c.createdAt, { dateStyle: "medium" })}</time>
                </p>
                {/* Texte brut, échappé par React (SPEC §5). */}
                <p className={styles.commentBody}>{c.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>{t("noComments")}</p>
        )}

        {session ? (
          <CommentForm projectId={project.id} />
        ) : (
          <p className={styles.loginPrompt}>
            {t("commentLoginRequired")}{" "}
            <Link href={{ pathname: "/connexion", query: { callbackUrl: `${selfPath}#commentaires` } }}>
              {t("commentLoginLink")}
            </Link>
          </p>
        )}
      </section>

      <TitleBlock
        title={`${t("plate")} ${num} · ${project.title}`}
        sheet={{ number: `02.${num}`, total: SHEET_TOTAL }}
        revision={project.updatedAt}
      />
    </main>
  );
}
