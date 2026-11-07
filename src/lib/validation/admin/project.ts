import "server-only";
import { z } from "zod";
import {
  boolish,
  idSchema,
  optionalHttpsUrl,
  optionalText,
  optionalUploadedUrl,
  requiredText,
  slugSchema,
  uploadedUrl,
} from "./common";

/* Formulaire projet (envoyé en JSON par le Client Component, revalidé ici). */

export const TITLE_MAX = 160;
export const SUMMARY_MAX = 600;
export const BODY_MAX = 100_000;
export const LONG_MAX = 20_000;
export const MEDIA_MAX = 30;

const frTranslation = z.object({
  title: requiredText(TITLE_MAX, "Le titre"),
  summary: requiredText(SUMMARY_MAX, "Le résumé"),
  objectives: optionalText(LONG_MAX),
  body: z.string().max(BODY_MAX, `${BODY_MAX} caractères maximum.`).default(""),
  results: optionalText(LONG_MAX),
  aiMethod: optionalText(LONG_MAX),
});

/** EN facultative dans son ensemble ; si un champ est rempli, titre et résumé deviennent obligatoires. */
const enTranslation = z
  .object({
    title: z.string().trim().max(TITLE_MAX, `${TITLE_MAX} caractères maximum.`).default(""),
    summary: z.string().trim().max(SUMMARY_MAX, `${SUMMARY_MAX} caractères maximum.`).default(""),
    objectives: optionalText(LONG_MAX),
    body: z.string().max(BODY_MAX, `${BODY_MAX} caractères maximum.`).default(""),
    results: optionalText(LONG_MAX),
    aiMethod: optionalText(LONG_MAX),
  })
  .superRefine((t, ctx) => {
    const any = Boolean(t.title || t.summary || t.objectives || t.body.trim() || t.results || t.aiMethod);
    if (!any) return;
    if (!t.title) ctx.addIssue({ code: "custom", path: ["title"], message: "Titre EN obligatoire dès qu'un champ EN est rempli." });
    if (!t.summary) ctx.addIssue({ code: "custom", path: ["summary"], message: "Résumé EN obligatoire dès qu'un champ EN est rempli." });
  });

export function isEnEmpty(t: z.infer<typeof enTranslation>): boolean {
  return !(t.title || t.summary || t.objectives || t.body.trim() || t.results || t.aiMethod);
}

const mediaItem = z.object({
  url: uploadedUrl("projectImage"),
  altFr: requiredText(300, "Le texte alternatif FR"),
  altEn: requiredText(300, "Le texte alternatif EN"),
  captionFr: optionalText(500),
  captionEn: optionalText(500),
});

export const projectInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  /** Mois au format AAAA-MM (input type="month"). */
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois attendu au format AAAA-MM.")
    .refine((v) => {
      const y = Number(v.slice(0, 4));
      return y >= 1990 && y <= 2100;
    }, "Année entre 1990 et 2100."),
  teamType: z.enum(["SOLO", "TEAM"], { error: "Choisissez solo ou équipe." }),
  aiAssisted: boolish,
  status: z.enum(["DRAFT", "PUBLISHED"], { error: "Statut invalide." }),
  featured: boolish,
  categoryIds: z.array(idSchema).max(20, "20 catégories maximum.").default([]),
  technologyIds: z.array(idSchema).max(40, "40 technologies maximum.").default([]),
  githubUrl: optionalHttpsUrl,
  demoUrl: optionalHttpsUrl,
  pdfUrl: optionalHttpsUrl,
  coverImageUrl: optionalUploadedUrl("projectImage"),
  /** SVG brut ou déjà assaini : toujours (re)passé dans sanitizeSvg() par l'action. */
  plateSvg: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().max(500_000, "SVG trop lourd (500 Ko max).").nullable().default(null)),
  media: z.array(mediaItem).max(MEDIA_MAX, `${MEDIA_MAX} médias maximum.`).default([]),
  fr: frTranslation,
  en: enTranslation,
});

export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectParsed = z.output<typeof projectInputSchema>;

/** Markdown à prévisualiser. */
export const previewSchema = z.string().max(BODY_MAX, "Texte trop long pour l'aperçu.");
