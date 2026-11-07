import "server-only";
import { db } from "@/lib/db";
import type { AppLocale } from "@/lib/i18n/routing";
import type { SchematicStyle } from "./projects";

/**
 * Lectures publiques hors projets : profil du site, relevé des domaines, interactions
 * (commentaires approuvés, favori de l'utilisateur courant). Agent 4.
 */

export type PublicProfile = {
  bio: string;
  /** Locale réelle de la bio (repli sur l'autre langue si vide). */
  bioLocale: AppLocale;
  cvUrl: string | null;
  photoUrl: string | null;
  githubUrl: string;
  linkedinUrl: string;
  email: string;
  updatedAt: Date | null;
};

// Valeurs de la SPEC §0 si le profil n'existe pas encore en base (aucune bio inventée).
const DEFAULT_PROFILE: Omit<PublicProfile, "bio" | "bioLocale" | "updatedAt"> = {
  cvUrl: null,
  photoUrl: null,
  githubUrl: "https://github.com/322sts",
  linkedinUrl: "https://www.linkedin.com/in/albangrelaud/",
  email: "albangrelaud@proton.me",
};

const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Profil public (SiteProfile id=1) dans la langue demandée. */
export async function getPublicProfile(locale: AppLocale): Promise<PublicProfile> {
  const row = await db.siteProfile.findUnique({ where: { id: 1 } });
  if (!row) return { ...DEFAULT_PROFILE, bio: "", bioLocale: locale, updatedAt: null };

  const own = locale === "en" ? row.bioEn : row.bioFr;
  const other = locale === "en" ? row.bioFr : row.bioEn;
  const useOwn = own.trim().length > 0 || other.trim().length === 0;
  return {
    bio: (useOwn ? own : other).trim(),
    bioLocale: useOwn ? locale : locale === "en" ? "fr" : "en",
    cvUrl: blankToNull(row.cvUrl),
    photoUrl: blankToNull(row.photoUrl),
    githubUrl: blankToNull(row.githubUrl) ?? DEFAULT_PROFILE.githubUrl,
    linkedinUrl: blankToNull(row.linkedinUrl) ?? DEFAULT_PROFILE.linkedinUrl,
    email: blankToNull(row.email) ?? DEFAULT_PROFILE.email,
    updatedAt: row.updatedAt,
  };
}

export type DomainCount = {
  slug: string;
  name: string;
  schematicStyle: SchematicStyle;
  /** Nombre RÉEL de projets publiés dans la catégorie (0 possible). */
  count: number;
};

/** Toutes les catégories (y compris vides) avec le nombre de projets publiés. */
export async function getDomainCounts(locale: AppLocale): Promise<DomainCount[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    include: {
      translations: { select: { locale: true, name: true } },
      _count: { select: { projects: { where: { project: { status: "PUBLISHED" } } } } },
    },
  });
  return rows.map((c) => {
    const tr = c.translations.find((t) => t.locale === locale) ?? c.translations[0];
    const style = c.schematicStyle;
    return {
      slug: c.slug,
      name: tr?.name ?? c.slug,
      schematicStyle:
        style === "finance" || style === "maths" || style === "info" || style === "ia" ? style : "generic",
      count: c._count.projects,
    };
  });
}

export type PublicComment = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
};

/** Commentaires APPROUVÉS d'un projet (jamais l'email de l'auteur). */
export async function getApprovedComments(projectId: string): Promise<PublicComment[]> {
  const rows = await db.comment.findMany({
    where: { projectId, status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, createdAt: true, user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorName: blankToNull(r.user.name),
    createdAt: r.createdAt,
  }));
}

/** Le projet est-il dans les favoris de cet utilisateur ? */
export async function isFavorite(userId: string, projectId: string): Promise<boolean> {
  const row = await db.favorite.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { projectId: true },
  });
  return row !== null;
}
