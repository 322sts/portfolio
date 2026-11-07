"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { type AdminResult, fail, invalid, ok, UNEXPECTED } from "@/lib/admin/result";
import { revalidateProfile } from "@/lib/admin/revalidate";
import { profileInputSchema } from "@/lib/validation/admin/profile";

/** Enregistre le profil du site (ligne unique id = 1, créée si absente). */
export async function saveProfile(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db.siteProfile.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
    revalidateProfile();
    return ok(null);
  } catch (e) {
    console.error("[admin] saveProfile", e);
    return fail(UNEXPECTED);
  }
}
