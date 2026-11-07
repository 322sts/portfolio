import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/badge/Badge";
import { Plate, type PlateProject } from "@/components/plate/Plate";
import { Prose } from "@/components/prose/Prose";
import { Sheet } from "@/components/sheet/Sheet";
import { Notice } from "@/components/notice/Notice";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import type { SchematicStyle } from "@/lib/queries/projects";
import { formatMonth, PageHeader } from "../../../_components/PageHeader";
import styles from "../../../_components/admin.module.css";

export const metadata: Metadata = { title: "Aperçu du projet" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ langue?: string }>;
};

const L = {
  fr: { objectives: "Objectifs", results: "Résultats", aiMethod: "Méthode IA", github: "Code source", demo: "Démo", pdf: "PDF", media: "Médias" },
  en: { objectives: "Objectives", results: "Results", aiMethod: "AI method", github: "Source code", demo: "Demo", pdf: "PDF", media: "Media" },
} as const;

function toStyle(v: string): SchematicStyle {
  return v === "finance" || v === "maths" || v === "info" || v === "ia" ? v : "generic";
}

/**
 * Aperçu d'un projet tel qu'il apparaîtra (planche + feuille de lecture), même en brouillon.
 * Mêmes composants et même pipeline Markdown que le site public ; la mise en page exacte
 * de la page détail publique relève de l'agent 4.
 */
export default async function AdminProjectPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { langue } = await searchParams;
  const locale = langue === "en" ? "en" : "fr";
  setRequestLocale(locale);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      translations: true,
      categories: { include: { category: { include: { translations: true } } }, orderBy: { category: { sortOrder: "asc" } } },
      technologies: { include: { technology: true }, orderBy: { technology: { name: "asc" } } },
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) notFound();

  // Numéro de planche : rang chronologique qu'il aurait parmi les publiés (lui compris).
  const published = await db.project.findMany({
    where: { OR: [{ status: "PUBLISHED" }, { id: project.id }] },
    orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const plateNumber = published.findIndex((p) => p.id === project.id) + 1;

  const tr = project.translations.find((t) => t.locale === locale) ?? project.translations.find((t) => t.locale === "fr") ?? project.translations[0];
  const fellBack = Boolean(tr && tr.locale !== locale);
  const labels = L[locale];

  const plate: PlateProject = {
    slug: project.slug,
    plateNumber,
    title: tr?.title ?? project.slug,
    summary: tr?.summary ?? "",
    date: project.date,
    teamType: project.teamType,
    aiAssisted: project.aiAssisted,
    plateSvg: project.plateSvg,
    categories: project.categories.map((pc) => ({
      slug: pc.category.slug,
      name: (pc.category.translations.find((t) => t.locale === locale) ?? pc.category.translations[0])?.name ?? pc.category.slug,
      schematicStyle: toStyle(pc.category.schematicStyle),
    })),
    technologies: project.technologies.map((pt) => ({ slug: pt.technology.slug, name: pt.technology.name })),
  };

  const sections: Array<{ title: string; md: string | null | undefined }> = [
    { title: labels.objectives, md: tr?.objectives },
    { title: "", md: tr?.body },
    { title: labels.results, md: tr?.results },
    { title: labels.aiMethod, md: tr?.aiMethod },
  ];
  const rendered = [];
  for (const s of sections) {
    if (s.md && s.md.trim()) rendered.push({ title: s.title, node: await renderMarkdown(s.md) });
  }

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A1.3"
        title={`Aperçu — ${tr?.title ?? project.slug}`}
        lede={
          <>
            <Badge tone={project.status === "PUBLISHED" ? "ok" : "neutral"}>{project.status === "PUBLISHED" ? "Publié" : "Brouillon — non visible sur le site"}</Badge> Langue :{" "}
            <Link href={`/admin/projets/${project.id}/apercu`} aria-current={locale === "fr" ? "page" : undefined}>
              FR
            </Link>{" "}
            /{" "}
            <Link href={`/admin/projets/${project.id}/apercu?langue=en`} aria-current={locale === "en" ? "page" : undefined}>
              EN
            </Link>
          </>
        }
        actions={
          <>
            <Link href={`/admin/projets/${project.id}`}>← Modifier</Link>
            {project.status === "PUBLISHED" ? (
              <a href={locale === "en" ? `/en/projects/${project.slug}` : `/projets/${project.slug}`} target="_blank" rel="noopener">
                Voir en ligne ↗
              </a>
            ) : null}
          </>
        }
      />
      {fellBack ? (
        <Notice tone="info" title="Traduction absente">
          Pas de traduction {locale.toUpperCase()} : le site affichera la version {tr?.locale.toUpperCase()} ci-dessous.
        </Notice>
      ) : null}

      <NextIntlClientProvider>
        <section className={styles.section} aria-labelledby="apercu-planche">
          <h2 id="apercu-planche" className={styles.sectionTitle}>
            Planche (liste des projets)
          </h2>
          <div className={styles.previewPlate}>
            <Plate project={plate} headingLevel={3} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="apercu-detail">
          <h2 id="apercu-detail" className={styles.sectionTitle}>
            Page détail
          </h2>
          <Sheet stamp={`PL. ${String(plateNumber).padStart(2, "0")}`}>
            <div lang={tr?.locale ?? locale}>
              <h1>{tr?.title ?? project.slug}</h1>
              <p className={styles.meta}>
                {formatMonth(project.date)} · {project.teamType === "TEAM" ? (locale === "en" ? "Team" : "Équipe") : "Solo"} ·{" "}
                {plate.technologies.map((t) => t.name).join(", ") || "—"} {project.aiAssisted ? <Badge tone="mark">{locale === "en" ? "AI-assisted" : "Assisté par IA"}</Badge> : null}
              </p>
              {tr?.summary ? <p>{tr.summary}</p> : null}
              {project.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu admin
                <img src={project.coverImageUrl} alt="" className={styles.previewImg} />
              ) : null}
              {rendered.map((r, i) => (
                <section key={i}>
                  {r.title ? <h2>{r.title}</h2> : null}
                  <Prose>{r.node}</Prose>
                </section>
              ))}
              {project.media.length ? (
                <section>
                  <h2>{labels.media}</h2>
                  {project.media.map((m) => (
                    <figure key={m.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- aperçu admin */}
                      <img src={m.url} alt={locale === "en" ? m.altEn : m.altFr} className={styles.previewImg} />
                      {(locale === "en" ? m.captionEn : m.captionFr) ? <figcaption>{locale === "en" ? m.captionEn : m.captionFr}</figcaption> : null}
                    </figure>
                  ))}
                </section>
              ) : null}
              <p>
                {project.githubUrl ? <a href={project.githubUrl}>{labels.github}</a> : null} {project.demoUrl ? <a href={project.demoUrl}>{labels.demo}</a> : null}{" "}
                {project.pdfUrl ? <a href={project.pdfUrl}>{labels.pdf}</a> : null}
              </p>
            </div>
          </Sheet>
        </section>
      </NextIntlClientProvider>
    </main>
  );
}
