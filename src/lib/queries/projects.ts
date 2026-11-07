import "server-only";
import { db } from "@/lib/db";
import type { AppLocale } from "@/lib/i18n/routing";
import {
  parseProjectFilters,
  type ProjectFilters,
  type RawSearchParams,
} from "@/lib/validation/project-filters";
import type { Prisma } from "@/generated/prisma/client";
import type { TeamType } from "@/generated/prisma/enums";

/**
 * Lectures publiques des projets (uniquement les projets PUBLISHED).
 * Utilisées par les pages publiques (agent 4) et réutilisables par l'admin (agent 5).
 */

export type SchematicStyle = "finance" | "maths" | "info" | "ia" | "generic";

export type CategoryRef = { slug: string; name: string; schematicStyle: SchematicStyle };
export type TechnologyRef = { slug: string; name: string };

export type ProjectListItem = {
  id: string;
  slug: string;
  /** Numéro de planche : rang chronologique (1 = plus ancien) parmi les projets publiés. */
  plateNumber: number;
  date: Date;
  teamType: TeamType;
  aiAssisted: boolean;
  featured: boolean;
  coverImageUrl: string | null;
  plateSvg: string | null;
  title: string;
  summary: string;
  /** Locale réellement utilisée pour les textes (repli si la traduction manque). */
  contentLocale: AppLocale;
  categories: CategoryRef[];
  technologies: TechnologyRef[];
  updatedAt: Date;
};

export type ProjectMediaItem = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
};

export type ProjectDetail = ProjectListItem & {
  objectives: string | null;
  /** Markdown brut : à rendre via le pipeline sécurisé de src/lib/markdown. */
  body: string;
  results: string | null;
  aiMethod: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  pdfUrl: string | null;
  media: ProjectMediaItem[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export type FilterOptions = {
  categories: Array<CategoryRef & { count: number }>;
  technologies: Array<TechnologyRef & { count: number }>;
  years: number[];
  hasAiAssisted: boolean;
  teamTypes: Array<"solo" | "team">;
};

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

const PUBLISHED = { status: "PUBLISHED" } as const satisfies Prisma.ProjectWhereInput;

/** Ordre chronologique de référence (numérotation des planches). */
const CHRONO_ORDER = [
  { date: "asc" },
  { sortOrder: "asc" },
  { createdAt: "asc" },
] as const satisfies Prisma.ProjectOrderByWithRelationInput[];

const listInclude = {
  translations: { select: { locale: true, title: true, summary: true } },
  categories: {
    include: { category: { include: { translations: { select: { locale: true, name: true } } } } },
    orderBy: { category: { sortOrder: "asc" } },
  },
  technologies: {
    include: { technology: { select: { slug: true, name: true } } },
    orderBy: { technology: { name: "asc" } },
  },
} as const satisfies Prisma.ProjectInclude;

type WithLocale = { locale: AppLocale };

/** Choisit la traduction de la locale demandée, sinon l'autre (jamais de page vide). */
function pickTranslation<T extends WithLocale>(items: T[], locale: AppLocale): T | undefined {
  return items.find((t) => t.locale === locale) ?? items[0];
}

function toSchematicStyle(value: string): SchematicStyle {
  return value === "finance" || value === "maths" || value === "info" || value === "ia"
    ? value
    : "generic";
}

function toCategoryRef(
  category: { slug: string; schematicStyle: string; translations: Array<{ locale: AppLocale; name: string }> },
  locale: AppLocale,
): CategoryRef {
  return {
    slug: category.slug,
    name: pickTranslation(category.translations, locale)?.name ?? category.slug,
    schematicStyle: toSchematicStyle(category.schematicStyle),
  };
}

/** Table id → numéro de planche (rang chronologique parmi les publiés). */
async function getPlateNumbers(): Promise<Map<string, number>> {
  const rows = await db.project.findMany({
    where: PUBLISHED,
    select: { id: true },
    orderBy: [...CHRONO_ORDER],
  });
  return new Map(rows.map((r, i) => [r.id, i + 1]));
}

type ListRow = Prisma.ProjectGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow, locale: AppLocale, plateNumbers: Map<string, number>): ProjectListItem {
  const tr = pickTranslation(row.translations, locale);
  return {
    id: row.id,
    slug: row.slug,
    plateNumber: plateNumbers.get(row.id) ?? 0,
    date: row.date,
    teamType: row.teamType,
    aiAssisted: row.aiAssisted,
    featured: row.featured,
    coverImageUrl: row.coverImageUrl,
    plateSvg: row.plateSvg,
    title: tr?.title ?? row.slug,
    summary: tr?.summary ?? "",
    contentLocale: tr?.locale ?? locale,
    categories: row.categories.map((pc) => toCategoryRef(pc.category, locale)),
    technologies: row.technologies.map((pt) => ({ slug: pt.technology.slug, name: pt.technology.name })),
    updatedAt: row.updatedAt,
  };
}

function buildWhere(filters: ProjectFilters): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { ...PUBLISHED };
  if (filters.cat) where.categories = { some: { category: { slug: filters.cat } } };
  if (filters.tech) where.technologies = { some: { technology: { slug: filters.tech } } };
  if (filters.annee) {
    where.date = {
      gte: new Date(Date.UTC(filters.annee, 0, 1)),
      lt: new Date(Date.UTC(filters.annee + 1, 0, 1)),
    };
  }
  if (filters.ia) where.aiAssisted = true;
  if (filters.equipe) where.teamType = filters.equipe === "solo" ? "SOLO" : "TEAM";
  return where;
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Projets publiés, filtrés et triés.
 * `filters` accepte soit des filtres déjà validés, soit les searchParams bruts de la page
 * (ils sont alors validés par Zod ; une valeur invalide est ignorée).
 * Tri `date` : plus récent d'abord ; tri `titre` : alphabétique dans la locale.
 */
export async function getPublishedProjects(
  locale: AppLocale,
  filters: ProjectFilters | RawSearchParams = {},
): Promise<ProjectListItem[]> {
  const parsed = isParsedFilters(filters) ? filters : parseProjectFilters(filters);

  const [rows, plateNumbers] = await Promise.all([
    db.project.findMany({
      where: buildWhere(parsed),
      include: listInclude,
      orderBy: [{ date: "desc" }, { sortOrder: "desc" }, { createdAt: "desc" }],
    }),
    getPlateNumbers(),
  ]);

  const items = rows.map((row) => toListItem(row, locale, plateNumbers));
  if (parsed.tri === "titre") {
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    items.sort((a, b) => collator.compare(a.title, b.title));
  }
  return items;
}

/** Détail d'un projet publié, ou `null` (→ notFound() côté page). */
export async function getProjectBySlug(locale: AppLocale, slug: string): Promise<ProjectDetail | null> {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;

  const row = await db.project.findFirst({
    where: { ...PUBLISHED, slug },
    include: {
      ...listInclude,
      translations: true,
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) return null;

  const plateNumbers = await getPlateNumbers();
  const tr = pickTranslation(row.translations, locale);
  const base = toListItem(row, locale, plateNumbers);

  // Planches voisines dans l'ordre chronologique.
  const ordered = [...plateNumbers.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const index = ordered.indexOf(row.id);
  const neighbourIds = [ordered[index - 1], ordered[index + 1]].filter(
    (id): id is string => typeof id === "string",
  );
  const neighbours = neighbourIds.length
    ? await db.project.findMany({
        where: { id: { in: neighbourIds } },
        select: { id: true, slug: true, translations: { select: { locale: true, title: true } } },
      })
    : [];
  const toRef = (id: string | undefined) => {
    const n = neighbours.find((p) => p.id === id);
    return n ? { slug: n.slug, title: pickTranslation(n.translations, locale)?.title ?? n.slug } : null;
  };

  return {
    ...base,
    objectives: tr?.objectives ?? null,
    body: tr?.body ?? "",
    results: tr?.results ?? null,
    aiMethod: tr?.aiMethod ?? null,
    githubUrl: row.githubUrl,
    demoUrl: row.demoUrl,
    pdfUrl: row.pdfUrl,
    media: row.media.map((m) => ({
      id: m.id,
      url: m.url,
      alt: locale === "en" ? m.altEn : m.altFr,
      caption: (locale === "en" ? m.captionEn : m.captionFr) ?? null,
    })),
    prev: toRef(ordered[index - 1]),
    next: toRef(ordered[index + 1]),
  };
}

/** Options de filtres calculées sur les projets publiés uniquement. */
export async function getFilterOptions(locale: AppLocale): Promise<FilterOptions> {
  const [categories, technologies, projects] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        translations: { select: { locale: true, name: true } },
        _count: { select: { projects: { where: { project: PUBLISHED } } } },
      },
    }),
    db.technology.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: { where: { project: PUBLISHED } } } } },
    }),
    db.project.findMany({
      where: PUBLISHED,
      select: { date: true, aiAssisted: true, teamType: true },
    }),
  ]);

  const years = [...new Set(projects.map((p) => p.date.getUTCFullYear()))].sort((a, b) => b - a);
  const teamTypes = (["solo", "team"] as const).filter((t) =>
    projects.some((p) => p.teamType === (t === "solo" ? "SOLO" : "TEAM")),
  );

  return {
    categories: categories
      .filter((c) => c._count.projects > 0)
      .map((c) => ({ ...toCategoryRef(c, locale), count: c._count.projects })),
    technologies: technologies
      .filter((t) => t._count.projects > 0)
      .map((t) => ({ slug: t.slug, name: t.name, count: t._count.projects })),
    years,
    hasAiAssisted: projects.some((p) => p.aiAssisted),
    teamTypes,
  };
}

function isParsedFilters(value: ProjectFilters | RawSearchParams): value is ProjectFilters {
  // Des filtres validés ont toujours `tri` et `vue` renseignés, et `ia` booléen.
  return typeof (value as ProjectFilters).ia === "boolean";
}
