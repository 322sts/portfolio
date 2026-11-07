"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { isQuotaExceeded, recordQuotaUse } from "@/lib/security/rate-limit";
import { type ActionResult, fail, ok, validationFailed } from "@/lib/validation/action-result";
import { changePasswordSchema } from "@/lib/validation/auth";

/** 5 erreurs d'ancien mot de passe par quart d'heure et par compte, puis blocage. */
const MAX_WRONG_CURRENT = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Change le mot de passe de l'utilisateur connecté (admin compris).
 * Contrat SPEC §5 : session → Zod → logique → résultat typé (clés i18n).
 */
export async function changePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailed(parsed.error);

  const quotaKey = `pwchange:${user.id}`;
  if (await isQuotaExceeded(quotaKey, MAX_WRONG_CURRENT, WINDOW_MS)) return fail("errors.rateLimited");

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  // Compte créé via GitHub : pas de mot de passe local à changer.
  if (!row?.passwordHash) return fail("account.passwordNoLocal");

  const { currentPassword, newPassword } = parsed.data;
  if (!(await verifyPassword(row.passwordHash, currentPassword))) {
    await recordQuotaUse(quotaKey);
    return fail("errors.validation", { currentPassword: "account.passwordWrongCurrent" });
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return ok(null);
}
