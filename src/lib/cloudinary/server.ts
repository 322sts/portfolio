import "server-only";
import { createHash } from "node:crypto";
import { env, features } from "@/lib/env";
import { UPLOAD_KINDS, type UploadKind, type UploadSignature } from "./kinds";

/*
 * Cloudinary, côté serveur uniquement : signature des uploads directs (le secret ne quitte
 * jamais le serveur) et validation des URL renvoyées avant enregistrement.
 * Signature Cloudinary : SHA-1 de « clé=valeur&… » (clés triées, sans file/api_key/resource_type) + secret.
 */

export const cloudinaryEnabled = features.cloudinary;

function sign(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

/** Signature pour un upload de type `kind` (dossier et formats imposés). null si Cloudinary absent. */
export function signUpload(kind: UploadKind): UploadSignature | null {
  if (!cloudinaryEnabled || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return null;
  }
  const spec = UPLOAD_KINDS[kind];
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { folder: spec.folder, timestamp };
  // allowed_formats n'a de sens que pour les images (Cloudinary ne détecte pas le format des « raw »).
  const allowedFormats = spec.resourceType === "image" ? spec.formats.join(",") : null;
  if (allowedFormats) params.allowed_formats = allowedFormats;

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${spec.resourceType}/upload`,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature: sign(params, env.CLOUDINARY_API_SECRET),
    folder: spec.folder,
    allowedFormats,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Vrai si `url` est un fichier livré par NOTRE compte Cloudinary, dans le dossier et le type
 * de ressource attendus pour ce `kind` (domaine + cloud name + dossier vérifiés).
 */
export function isOwnCloudinaryUrl(url: string, kind: UploadKind): boolean {
  if (!env.CLOUDINARY_CLOUD_NAME) return false;
  const spec = UPLOAD_KINDS[kind];
  const ext = spec.formats.map(escapeRegExp).join("|");
  const re = new RegExp(
    `^https://res\\.cloudinary\\.com/${escapeRegExp(env.CLOUDINARY_CLOUD_NAME)}/${spec.resourceType}/upload/` +
      `(?:v\\d+/)?${escapeRegExp(spec.folder)}/[A-Za-z0-9_\\-]+(?:/[A-Za-z0-9_\\-]+)*\\.(?:${ext})$`,
    "i",
  );
  return re.test(url);
}

/** Description lisible du mode d'upload (affichée dans l'admin). */
export function uploadMode(): { enabled: boolean } {
  return { enabled: cloudinaryEnabled };
}
