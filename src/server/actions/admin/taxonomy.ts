"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { type AdminResult, fail, invalid, ok, UNEXPECTED } from "@/lib/admin/result";
import { revalidateTaxonomy } from "@/lib/admin/revalidate";
import { slugify } from "@/lib/admin/slug";
import {
  categoryInputSchema,
  deleteTaxonomySchema,
  quickTechnologySchema,
  technologyInputSchema,
} from "@/lib/validation/admin/taxonomy";
import { Prisma } from "@/generated/prisma/client";

/* CRUD catégories et technologies (requireAdmin → Zod → Prisma → revalidatePath). */

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const SLUG_TAKEN = { slug: "Ce slug est déjà utilisé." };

export async function saveCategory(input: unknown): Promise<AdminResult<{ id: string }>> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;
  try {
    const taken = await db.category.findFirst({ where: { slug: c.slug, ...(c.id ? { NOT: { id: c.id } } : {}) }, select: { id: true } });
    if (taken) return fail("Ce slug est déjà utilisé.", SLUG_TAKEN);
    const data = { slug: c.slug, schematicStyle: c.schematicStyle, sortOrder: c.sortOrder };
    const id = await db.$transaction(async (tx) => {
      const row = c.id
        ? await tx.category.update({ where: { id: c.id }, data, select: { id: true } })
        : await tx.category.create({ data, select: { id: true } });
      for (const [locale, name] of [["fr", c.nameFr], ["en", c.nameEn]] as const) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: row.id, locale } },
          create: { categoryId: row.id, locale, name },
          update: { name },
        });
      }
      return row.id;
    });
    revalidateTaxonomy();
    return ok({ id });
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Ce slug est déjà utilisé.", SLUG_TAKEN);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return fail("Catégorie introuvable.");
    console.error("[admin] saveCategory", e);
    return fail(UNEXPECTED);
  }
}

/**
 * Supprime une catégorie. Si des projets l'utilisent : refus explicite, sauf `detach: true`
 * (les projets sont alors détachés de cette catégorie, puis elle est supprimée).
 */
export async function deleteCategory(input: unknown): Promise<AdminResult<{ detached: number }>> {
  await requireAdmin();
  const parsed = deleteTaxonomySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, detach } = parsed.data;
  const used = await db.projectCategory.count({ where: { categoryId: id } });
  if (used > 0 && !detach) {
    return fail(`Suppression refusée : ${used} projet(s) utilisent cette catégorie. Détachez-les d'abord (bouton « Détacher et supprimer »).`);
  }
  const deleted = await db.$transaction(async (tx) => {
    await tx.projectCategory.deleteMany({ where: { categoryId: id } });
    return tx.category.deleteMany({ where: { id } });
  });
  if (!deleted.count) return fail("Catégorie introuvable (déjà supprimée ?).");
  revalidateTaxonomy();
  return ok({ detached: used });
}

export async function saveTechnology(input: unknown): Promise<AdminResult<{ id: string }>> {
  await requireAdmin();
  const parsed = technologyInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const t = parsed.data;
  try {
    const taken = await db.technology.findFirst({ where: { slug: t.slug, ...(t.id ? { NOT: { id: t.id } } : {}) }, select: { id: true } });
    if (taken) return fail("Ce slug est déjà utilisé.", SLUG_TAKEN);
    const data = { slug: t.slug, name: t.name };
    const row = t.id
      ? await db.technology.update({ where: { id: t.id }, data, select: { id: true } })
      : await db.technology.create({ data, select: { id: true } });
    revalidateTaxonomy();
    return ok({ id: row.id });
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Ce slug est déjà utilisé.", SLUG_TAKEN);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return fail("Technologie introuvable.");
    console.error("[admin] saveTechnology", e);
    return fail(UNEXPECTED);
  }
}

/** Création rapide depuis le formulaire projet ; renvoie la techno existante si le slug existe déjà. */
export async function quickCreateTechnology(input: unknown): Promise<AdminResult<{ id: string; slug: string; name: string; existed: boolean }>> {
  await requireAdmin();
  const parsed = quickTechnologySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const slug = slugify(parsed.data.name);
  if (!slug) return fail("Nom invalide.", { name: "Le nom doit contenir au moins une lettre ou un chiffre." });
  const existing = await db.technology.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
  if (existing) return ok({ ...existing, existed: true });
  try {
    const row = await db.technology.create({ data: { slug, name: parsed.data.name }, select: { id: true, slug: true, name: true } });
    revalidateTaxonomy();
    return ok({ ...row, existed: false });
  } catch (e) {
    console.error("[admin] quickCreateTechnology", e);
    return fail(UNEXPECTED);
  }
}

export async function deleteTechnology(input: unknown): Promise<AdminResult<{ detached: number }>> {
  await requireAdmin();
  const parsed = deleteTaxonomySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, detach } = parsed.data;
  const used = await db.projectTechnology.count({ where: { technologyId: id } });
  if (used > 0 && !detach) {
    return fail(`Suppression refusée : ${used} projet(s) utilisent cette technologie. Détachez-les d'abord (bouton « Détacher et supprimer »).`);
  }
  const deleted = await db.$transaction(async (tx) => {
    await tx.projectTechnology.deleteMany({ where: { technologyId: id } });
    return tx.technology.deleteMany({ where: { id } });
  });
  if (!deleted.count) return fail("Technologie introuvable (déjà supprimée ?).");
  revalidateTaxonomy();
  return ok({ detached: used });
}
