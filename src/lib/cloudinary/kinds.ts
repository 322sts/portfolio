/**
 * Types d'upload autorisés (partagé client / serveur, aucune donnée secrète).
 * Le dossier et le type de ressource sont IMPOSÉS par le serveur dans la signature :
 * le navigateur ne choisit que le « kind ».
 */
export const UPLOAD_KINDS = {
  projectImage: {
    folder: "portfolio/projets",
    resourceType: "image",
    formats: ["jpg", "jpeg", "png", "webp"],
    mime: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    label: "image JPG, PNG ou WebP (5 Mo max)",
  },
  profilePhoto: {
    folder: "portfolio/profil",
    resourceType: "image",
    formats: ["jpg", "jpeg", "png", "webp"],
    mime: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 3 * 1024 * 1024,
    label: "photo JPG, PNG ou WebP (3 Mo max)",
  },
  cv: {
    folder: "portfolio/cv",
    resourceType: "raw",
    formats: ["pdf"],
    mime: ["application/pdf"],
    maxBytes: 5 * 1024 * 1024,
    label: "PDF (5 Mo max)",
  },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

export function isUploadKind(v: unknown): v is UploadKind {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(UPLOAD_KINDS, v);
}

/** Paramètres signés renvoyés au navigateur pour un upload direct vers Cloudinary. */
export type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  /** Liste « jpg,png,… » signée (images uniquement). */
  allowedFormats: string | null;
};
