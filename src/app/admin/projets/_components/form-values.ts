import "server-only";
import type { getProjectForEdit } from "@/lib/admin/queries";
import type { ProjectFormValues, TranslationValues } from "./ProjectForm";

type EditProject = NonNullable<Awaited<ReturnType<typeof getProjectForEdit>>>;

const emptyTr: TranslationValues = { title: "", summary: "", objectives: "", body: "", results: "", aiMethod: "" };

function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Valeurs d'un nouveau projet : brouillon daté du mois courant. */
export function emptyProjectValues(): ProjectFormValues {
  return {
    slug: "",
    month: monthOf(new Date()),
    teamType: "SOLO",
    aiAssisted: false,
    status: "DRAFT",
    featured: false,
    categoryIds: [],
    technologyIds: [],
    githubUrl: "",
    demoUrl: "",
    pdfUrl: "",
    coverImageUrl: "",
    plateSvg: null,
    media: [],
    fr: { ...emptyTr },
    en: { ...emptyTr },
  };
}

export function projectToValues(p: EditProject): ProjectFormValues {
  const tr = (locale: "fr" | "en"): TranslationValues => {
    const t = p.translations.find((x) => x.locale === locale);
    if (!t) return { ...emptyTr };
    return {
      title: t.title,
      summary: t.summary,
      objectives: t.objectives ?? "",
      body: t.body,
      results: t.results ?? "",
      aiMethod: t.aiMethod ?? "",
    };
  };
  return {
    id: p.id,
    slug: p.slug,
    month: monthOf(p.date),
    teamType: p.teamType,
    aiAssisted: p.aiAssisted,
    status: p.status,
    featured: p.featured,
    categoryIds: p.categories.map((c) => c.categoryId),
    technologyIds: p.technologies.map((t) => t.technologyId),
    githubUrl: p.githubUrl ?? "",
    demoUrl: p.demoUrl ?? "",
    pdfUrl: p.pdfUrl ?? "",
    coverImageUrl: p.coverImageUrl ?? "",
    plateSvg: p.plateSvg,
    media: p.media.map((m) => ({
      key: m.id,
      url: m.url,
      altFr: m.altFr,
      altEn: m.altEn,
      captionFr: m.captionFr ?? "",
      captionEn: m.captionEn ?? "",
    })),
    fr: tr("fr"),
    en: tr("en"),
  };
}
