import "server-only";
import { z } from "zod";
import { cloudinaryEnabled, isOwnCloudinaryUrl } from "@/lib/cloudinary/server";
import type { UploadKind } from "@/lib/cloudinary/kinds";
import { SLUG_PATTERN } from "@/lib/admin/slug";

/* Briques Zod de l'admin (messages en français, affichés tels quels). */

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const idSchema = z.string().trim().min(1, "Identifiant manquant.").max(64, "Identifiant invalide.");

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Le slug est obligatoire.")
  .max(80, "80 caractères maximum.")
  .regex(SLUG_PATTERN, "Uniquement a-z, 0-9 et tirets (ex. mon-projet).");

export const requiredText = (max: number, label = "Ce champ") =>
  z.string().trim().min(1, `${label} est obligatoire.`).max(max, `${max} caractères maximum.`);

export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `${max} caractères maximum.`).nullable().default(null));

function isHttps(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export const httpsUrl = z
  .string()
  .trim()
  .max(2000, "URL trop longue.")
  .refine(isHttps, "URL https:// complète attendue (ex. https://github.com/…).");

export const optionalHttpsUrl = z.preprocess(emptyToNull, httpsUrl.nullable().default(null));

/** Chemin local servi par le site (dossier public/), ex. /images/couverture.png. */
const LOCAL_PATH = /^\/(?!\/)[A-Za-z0-9_\-./]+$/;

/**
 * URL d'un fichier uploadé (image, photo, CV) :
 *  - Cloudinary configuré → uniquement NOTRE compte Cloudinary, bon dossier et bon type, ou un chemin local ;
 *  - Cloudinary absent → toute URL https (ou chemin local). Les images restent soumises à la CSP
 *    (img-src : site + res.cloudinary.com).
 * `lenient` (CV) : toute URL https acceptée même si Cloudinary est configuré (c'est un simple lien).
 */
export function uploadedUrl(kind: UploadKind, { lenient = false } = {}) {
  return z
    .string()
    .trim()
    .max(2000, "URL trop longue.")
    .refine(
      (v) => {
        if (LOCAL_PATH.test(v) && !v.includes("..")) return true;
        if (!isHttps(v)) return false;
        if (!cloudinaryEnabled || lenient) return true;
        return isOwnCloudinaryUrl(v, kind);
      },
      cloudinaryEnabled && !lenient
        ? "Utilisez le bouton d'envoi : seules les URL de votre compte Cloudinary (res.cloudinary.com) sont acceptées."
        : "URL https:// complète attendue.",
    );
}

export function optionalUploadedUrl(kind: UploadKind, opts?: { lenient?: boolean }) {
  return z.preprocess(emptyToNull, uploadedUrl(kind, opts).nullable().default(null));
}

/** Case à cocher envoyée en JSON (booléen) ou en FormData ("on"). */
export const boolish = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

export const sortOrderSchema = z.coerce
  .number({ error: "Nombre entier attendu." })
  .int("Nombre entier attendu.")
  .min(-9999, "Valeur trop petite.")
  .max(9999, "Valeur trop grande.");
