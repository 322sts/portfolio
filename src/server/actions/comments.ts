"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HOUR_MS } from "@/lib/security/rate-limit";
import { type ActionResult, fail, ok, validationFailed } from "@/lib/validation/action-result";
import { commentSchema, idSchema } from "@/lib/validation/comments";

const COMMENTS_MAX_PER_HOUR = 5;

function revalidateCommentViews(): void {
  revalidatePath("/[locale]/projets/[slug]", "page");
  revalidatePath("/[locale]/compte", "page");
  revalidatePath("/admin/commentaires");
  revalidatePath("/admin");
}

/**
 * Ajoute un commentaire (texte brut, statut PENDING : visible seulement après modération).
 * Utilisable avec `useActionState` : champs `projectId` et `body`.
 */
export async function addComment(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = commentSchema.safeParse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return validationFailed(parsed.error);

  // 5 commentaires / heure / utilisateur (comptés directement dans la table Comment).
  const recent = await db.comment.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= COMMENTS_MAX_PER_HOUR) return fail("errors.rateLimited");

  const project = await db.project.findFirst({
    where: { id: parsed.data.projectId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!project) return fail("errors.notFound");

  const comment = await db.comment.create({
    data: { projectId: project.id, userId: user.id, body: parsed.data.body, status: "PENDING" },
    select: { id: true },
  });

  revalidateCommentViews();
  return ok(comment);
}

/** Supprime un de SES commentaires (quel que soit son statut). */
export async function deleteOwnComment(commentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(commentId);
  if (!parsed.success) return fail("errors.notFound");

  // Filtre sur userId : impossible de supprimer le commentaire d'un autre.
  const { count } = await db.comment.deleteMany({ where: { id: parsed.data, userId: user.id } });
  if (count === 0) return fail("errors.notFound");

  revalidateCommentViews();
  return ok(null);
}
