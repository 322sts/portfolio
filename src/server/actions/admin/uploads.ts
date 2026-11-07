"use server";

import { requireAdmin } from "@/lib/auth";
import { type AdminResult, fail, ok } from "@/lib/admin/result";
import { isUploadKind, type UploadSignature } from "@/lib/cloudinary/kinds";
import { signUpload } from "@/lib/cloudinary/server";

/**
 * Signature d'un upload direct navigateur → Cloudinary. Le dossier (`portfolio/…`), le type
 * de ressource (image / raw) et les formats sont imposés ici d'après `kind` ; l'URL obtenue
 * est revalidée (domaine + cloud name + dossier) à l'enregistrement du formulaire.
 */
export async function getUploadSignature(kind: unknown): Promise<AdminResult<UploadSignature>> {
  await requireAdmin();
  if (!isUploadKind(kind)) return fail("Type d'envoi inconnu.");
  const sig = signUpload(kind);
  if (!sig) return fail("Cloudinary non configuré : collez une URL https à la place.");
  return ok(sig);
}
