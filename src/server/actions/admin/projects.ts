"use server";

import type { ReactNode } from "react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeSvg } from "@/lib/security/sanitize-svg";
import { type AdminResult, fail, invalid, ok, UNEXPECTED } from "@/lib/admin/result";
import { revalidateProjects } from "@/lib/admin/revalidate";
import { idSchema } from "@/lib/validation/admin/common";
import { isEnEmpty, previewSchema, projectInputSchema } from "@/lib/validation/admin/project";
import { Prisma } from "@/generated/prisma/client";

/*
 * Server Actions des projets. Ordre imposé (SPEC §5) : requireAdmin() → Zod → Prisma → revalidatePath.
 * requireAdmin() renvoie une 404 à un visiteur (et redirige un anonyme vers la connexion),
 * y compris lors d'un appel direct de l'action.
 */

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export type SaveProjectResult = { id: string; slug: string; status: "DRAFT" | "PUBLISHED"; enEmpty: boolean };

/** Crée (sans `id`) ou met à jour (avec `id`) un projet complet, traductions et relations comprises. */
export async function saveProject(input: unknown): Promise<AdminResult<SaveProjectResult>> {
  await requireAdmin();
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const p = parsed.data;

  // SVG de planche : TOUJOURS assaini à l'enregistrement, même s'il l'a déjà été pour l'aperçu.
  let plateSvg: string | null = null;
  if (p.plateSvg) {
    plateSvg = sanitizeSvg(p.plateSvg);
    if (!plateSvg) return fail("Le SVG de planche est invalide.", { plateSvg: "SVG vide ou invalide après nettoyage de sécurité." });
  }

  try {
    if (p.id) {
      const exists = await db.project.findUnique({ where: { id: p.id }, select: { id: true } });
      if (!exists) return fail("Ce projet n'existe plus (supprimé entre-temps ?).");
    }
    const taken = await db.project.findFirst({
      where: { slug: p.slug, ...(p.id ? { NOT: { id: p.id } } : {}) },
      select: { id: true },
    });
    if (taken) return fail("Ce slug est déjà utilisé.", { slug: "Déjà utilisé par un autre projet : choisissez-en un autre." });

    const categoryIds = [...new Set(p.categoryIds)];
    const technologyIds = [...new Set(p.technologyIds)];
    const catCount = await db.category.count({ where: { id: { in: categoryIds } } });
    if (catCount !== categoryIds.length) return fail("Une catégorie sélectionnée n'existe plus.", { categoryIds: "Rechargez la page : une catégorie a été supprimée." });
    const techCount = await db.technology.count({ where: { id: { in: technologyIds } } });
    if (techCount !== technologyIds.length) return fail("Une technologie sélectionnée n'existe plus.", { technologyIds: "Rechargez la page : une technologie a été supprimée." });

    const [y, m] = p.month.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    const enEmpty = isEnEmpty(p.en);

    const scalar = {
      slug: p.slug,
      status: p.status,
      date,
      teamType: p.teamType,
      aiAssisted: p.aiAssisted,
      featured: p.featured,
      coverImageUrl: p.coverImageUrl,
      plateSvg,
      githubUrl: p.githubUrl,
      demoUrl: p.demoUrl,
      pdfUrl: p.pdfUrl,
    };
    const fr = { ...p.fr };
    const en = { ...p.en };

    const saved = await db.$transaction(async (tx) => {
      let id = p.id;
      if (id) {
        await tx.project.update({ where: { id }, data: scalar });
        await tx.projectCategory.deleteMany({ where: { projectId: id } });
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        await tx.projectMedia.deleteMany({ where: { projectId: id } });
      } else {
        // Nouveau projet : placé en tête de l'ordre manuel.
        const min = await tx.project.aggregate({ _min: { sortOrder: true } });
        const created = await tx.project.create({ data: { ...scalar, sortOrder: (min._min.sortOrder ?? 1) - 1 }, select: { id: true } });
        id = created.id;
      }
      await tx.projectTranslation.upsert({
        where: { projectId_locale: { projectId: id, locale: "fr" } },
        create: { projectId: id, locale: "fr", ...fr },
        update: fr,
      });
      if (enEmpty) {
        // Traduction EN vide : pas de ligne EN, le site public se replie sur le français.
        await tx.projectTranslation.deleteMany({ where: { projectId: id, locale: "en" } });
      } else {
        await tx.projectTranslation.upsert({
          where: { projectId_locale: { projectId: id, locale: "en" } },
          create: { projectId: id, locale: "en", ...en },
          update: en,
        });
      }
      if (categoryIds.length) await tx.projectCategory.createMany({ data: categoryIds.map((categoryId) => ({ projectId: id, categoryId })) });
      if (technologyIds.length) await tx.projectTechnology.createMany({ data: technologyIds.map((technologyId) => ({ projectId: id, technologyId })) });
      if (p.media.length) {
        await tx.projectMedia.createMany({ data: p.media.map((md, i) => ({ projectId: id, sortOrder: i, ...md })) });
      }
      return { id, slug: p.slug, status: p.status };
    });

    revalidateProjects();
    return ok({ ...saved, enEmpty });
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Ce slug est déjà utilisé.", { slug: "Déjà utilisé par un autre projet." });
    console.error("[admin] saveProject", e);
    return fail(UNEXPECTED);
  }
}

const statusSchema = z.object({ id: idSchema, status: z.enum(["DRAFT", "PUBLISHED"]) });

export async function setProjectStatus(id: string, status: "DRAFT" | "PUBLISHED"): Promise<AdminResult> {
  await requireAdmin();
  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.project.updateMany({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  if (!count) return fail("Projet introuvable.");
  revalidateProjects();
  return ok(null);
}

const featuredSchema = z.object({ id: idSchema, featured: z.boolean() });

export async function setProjectFeatured(id: string, featured: boolean): Promise<AdminResult> {
  await requireAdmin();
  const parsed = featuredSchema.safeParse({ id, featured });
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.project.updateMany({ where: { id: parsed.data.id }, data: { featured: parsed.data.featured } });
  if (!count) return fail("Projet introuvable.");
  revalidateProjects();
  return ok(null);
}

const moveSchema = z.object({ id: idSchema, direction: z.enum(["up", "down"]) });

/**
 * Déplace un projet d'un cran dans l'ordre manuel : échange son sortOrder avec celui du voisin.
 * Si les deux valeurs sont égales (ex. projets créés sans ordre), tous les projets sont
 * renumérotés 1..n dans l'ordre affiché, avec l'échange appliqué.
 */
export async function moveProject(id: string, direction: "up" | "down"): Promise<AdminResult> {
  await requireAdmin();
  const parsed = moveSchema.safeParse({ id, direction });
  if (!parsed.success) return invalid(parsed.error);

  const rows = await db.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const i = rows.findIndex((r) => r.id === parsed.data.id);
  if (i === -1) return fail("Projet introuvable.");
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= rows.length) return ok(null);
  const a = rows[i];
  const b = rows[j];

  if (a.sortOrder !== b.sortOrder) {
    await db.$transaction([
      db.project.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      db.project.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
  } else {
    const ids = rows.map((r) => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await db.$transaction(ids.map((pid, index) => db.project.update({ where: { id: pid }, data: { sortOrder: index + 1 } })));
  }
  revalidateProjects();
  return ok(null);
}

export async function deleteProject(id: string): Promise<AdminResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  // Cascade (SPEC §4) : traductions, liaisons, médias, favoris et commentaires.
  const { count } = await db.project.deleteMany({ where: { id: parsed.data } });
  if (!count) return fail("Projet introuvable (déjà supprimé ?).");
  revalidateProjects();
  return ok(null);
}

/** Assainit un SVG importé pour l'aperçu (le même traitement est refait à l'enregistrement). */
export async function sanitizePlateSvg(svg: unknown): Promise<AdminResult<{ svg: string; removedBytes: number }>> {
  await requireAdmin();
  const parsed = z.string().min(1, "Fichier vide.").max(500_000, "SVG trop lourd (500 Ko max).").safeParse(svg);
  if (!parsed.success) return invalid(parsed.error);
  const clean = sanitizeSvg(parsed.data);
  if (!clean) return fail("Ce fichier n'est pas un SVG valide (ou il est vide après nettoyage de sécurité).");
  return ok({ svg: clean, removedBytes: Math.max(0, parsed.data.length - clean.length) });
}

/** Rendu Markdown côté serveur (même pipeline sécurisé que le site public). */
export async function previewMarkdown(markdown: unknown): Promise<AdminResult<{ html: ReactNode }>> {
  await requireAdmin();
  const parsed = previewSchema.safeParse(markdown);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const html = await renderMarkdown(parsed.data);
    return ok({ html });
  } catch (e) {
    console.error("[admin] previewMarkdown", e);
    return fail("Le rendu de l'aperçu a échoué.");
  }
}
