"use client";

import { UPLOAD_KINDS, type UploadKind, type UploadSignature } from "./kinds";

/** Vérifications côté navigateur avant envoi (le serveur revalide l'URL obtenue). */
export function checkFile(file: File, kind: UploadKind): string | null {
  const spec = UPLOAD_KINDS[kind];
  if (!(spec.mime as readonly string[]).includes(file.type)) return `Format refusé : ${spec.label} attendu.`;
  if (file.size > spec.maxBytes) return `Fichier trop lourd : ${spec.label}.`;
  return null;
}

/**
 * Upload direct navigateur → Cloudinary avec les paramètres signés par le serveur.
 * Renvoie l'URL https de livraison, ou une erreur lisible.
 */
export async function uploadToCloudinary(
  file: File,
  sig: UploadSignature,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sig.apiKey);
  body.append("timestamp", String(sig.timestamp));
  body.append("signature", sig.signature);
  body.append("folder", sig.folder);
  if (sig.allowedFormats) body.append("allowed_formats", sig.allowedFormats);

  try {
    const res = await fetch(sig.uploadUrl, { method: "POST", body });
    const json = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
    if (!res.ok || !json?.secure_url) {
      return { ok: false, error: `Échec de l'envoi vers Cloudinary${json?.error?.message ? ` : ${json.error.message}` : ""}.` };
    }
    return { ok: true, url: json.secure_url };
  } catch {
    return { ok: false, error: "Cloudinary injoignable (réseau ou CSP). Réessayez." };
  }
}
