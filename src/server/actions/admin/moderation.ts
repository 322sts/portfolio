"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { type AdminResult, fail, invalid, ok } from "@/lib/admin/result";
import { revalidateComments, revalidateMessages } from "@/lib/admin/revalidate";
import { idSchema } from "@/lib/validation/admin/common";

/* Modération des commentaires et gestion des messages de contact. */

const commentStatusSchema = z.object({ id: idSchema, status: z.enum(["PENDING", "APPROVED", "REJECTED"]) });

export async function setCommentStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<AdminResult> {
  await requireAdmin();
  const parsed = commentStatusSchema.safeParse({ id, status });
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.comment.updateMany({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  if (!count) return fail("Commentaire introuvable.");
  revalidateComments();
  return ok(null);
}

export async function deleteComment(id: string): Promise<AdminResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.comment.deleteMany({ where: { id: parsed.data } });
  if (!count) return fail("Commentaire introuvable (déjà supprimé ?).");
  revalidateComments();
  return ok(null);
}

const readSchema = z.object({ id: idSchema, read: z.boolean() });

export async function setMessageRead(id: string, read: boolean): Promise<AdminResult> {
  await requireAdmin();
  const parsed = readSchema.safeParse({ id, read });
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.contactMessage.updateMany({ where: { id: parsed.data.id }, data: { read: parsed.data.read } });
  if (!count) return fail("Message introuvable.");
  revalidateMessages();
  return ok(null);
}

export async function deleteMessage(id: string): Promise<AdminResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  const { count } = await db.contactMessage.deleteMany({ where: { id: parsed.data } });
  if (!count) return fail("Message introuvable (déjà supprimé ?).");
  revalidateMessages();
  return ok(null);
}
