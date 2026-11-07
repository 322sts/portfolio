import "server-only";
import { db } from "@/lib/db";
import type { CommentStatus } from "@/generated/prisma/enums";

/*
 * Lectures BDD de l'admin (tous statuts, brouillons compris).
 * À n'appeler que depuis des pages sous /admin (le layout a déjà exigé le rôle ADMIN).
 * Requêtes séquentielles (pas de Promise.all) : en dev, `prisma dev` n'accepte qu'une connexion.
 */

export async function getDashboardData() {
  const published = await db.project.count({ where: { status: "PUBLISHED" } });
  const drafts = await db.project.findMany({
    where: { status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, updatedAt: true, translations: { select: { locale: true, title: true } } },
  });
  const pendingCount = await db.comment.count({ where: { status: "PENDING" } });
  const pending = await db.comment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { email: true } },
      project: { select: { id: true, slug: true, translations: { where: { locale: "fr" }, select: { title: true } } } },
    },
  });
  const unreadCount = await db.contactMessage.count({ where: { read: false } });
  const unread = await db.contactMessage.findMany({
    where: { read: false },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, subject: true, createdAt: true },
  });
  const categories = await db.category.count();
  const technologies = await db.technology.count();
  const missingEn = await db.project.findMany({
    where: { translations: { none: { locale: "en" } } },
    select: { id: true, slug: true },
  });
  const profile = await db.siteProfile.findUnique({ where: { id: 1 }, select: { cvUrl: true, photoUrl: true, updatedAt: true } });
  return { published, drafts, pendingCount, pending, unreadCount, unread, categories, technologies, missingEn, profile };
}

export type AdminProjectRow = Awaited<ReturnType<typeof getAdminProjects>>[number];

/** Projets dans l'ordre d'affichage admin : sortOrder croissant, puis date décroissante. */
export async function getAdminProjects() {
  const rows = await db.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      status: true,
      date: true,
      aiAssisted: true,
      featured: true,
      sortOrder: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true } },
      categories: { select: { category: { select: { slug: true, translations: { where: { locale: "fr" }, select: { name: true } } } } } },
      _count: { select: { comments: { where: { status: "PENDING" } } } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    status: p.status,
    date: p.date,
    aiAssisted: p.aiAssisted,
    featured: p.featured,
    sortOrder: p.sortOrder,
    updatedAt: p.updatedAt,
    titleFr: p.translations.find((t) => t.locale === "fr")?.title ?? null,
    hasEn: p.translations.some((t) => t.locale === "en"),
    categories: p.categories.map((c) => c.category.translations[0]?.name ?? c.category.slug),
    pendingComments: p._count.comments,
  }));
}

/** Projet complet pour le formulaire d'édition (null si introuvable). */
export async function getProjectForEdit(id: string) {
  return db.project.findUnique({
    where: { id },
    include: {
      translations: true,
      categories: { select: { categoryId: true } },
      technologies: { select: { technologyId: true } },
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Options des listes du formulaire projet. */
export async function getTaxonomyOptions() {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    select: { id: true, slug: true, schematicStyle: true, translations: { select: { locale: true, name: true } } },
  });
  const technologies = await db.technology.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } });
  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      schematicStyle: c.schematicStyle,
      name: c.translations.find((t) => t.locale === "fr")?.name ?? c.slug,
    })),
    technologies,
  };
}

export async function getAdminCategories() {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      schematicStyle: true,
      sortOrder: true,
      translations: { select: { locale: true, name: true } },
      _count: { select: { projects: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    schematicStyle: c.schematicStyle,
    sortOrder: c.sortOrder,
    nameFr: c.translations.find((t) => t.locale === "fr")?.name ?? "",
    nameEn: c.translations.find((t) => t.locale === "en")?.name ?? "",
    projectCount: c._count.projects,
  }));
}

export async function getAdminTechnologies() {
  const rows = await db.technology.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, _count: { select: { projects: true } } },
  });
  return rows.map((t) => ({ id: t.id, slug: t.slug, name: t.name, projectCount: t._count.projects }));
}

export async function getAdminComments(status: CommentStatus | null) {
  const rows = await db.comment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      body: true,
      status: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      project: { select: { id: true, slug: true, status: true, translations: { where: { locale: "fr" }, select: { title: true } } } },
    },
  });
  const counts = await db.comment.groupBy({ by: ["status"], _count: { _all: true } });
  const countOf = (s: CommentStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return {
    rows,
    counts: { PENDING: countOf("PENDING"), APPROVED: countOf("APPROVED"), REJECTED: countOf("REJECTED") },
  };
}

export async function getAdminMessages() {
  return db.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, name: true, email: true, subject: true, read: true, createdAt: true },
  });
}

/** Lit un message ; le marque comme lu au passage (lecture explicite par l'admin). */
export async function readMessage(id: string) {
  const msg = await db.contactMessage.findUnique({ where: { id } });
  if (msg && !msg.read) {
    await db.contactMessage.update({ where: { id }, data: { read: true } });
    return { ...msg, read: true, justRead: true };
  }
  return msg ? { ...msg, justRead: false } : null;
}

export async function getProfile() {
  return db.siteProfile.findUnique({ where: { id: 1 } });
}
