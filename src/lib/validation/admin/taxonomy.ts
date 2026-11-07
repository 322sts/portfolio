import "server-only";
import { z } from "zod";
import { idSchema, requiredText, slugSchema, sortOrderSchema } from "./common";

export const SCHEMATIC_STYLES = ["finance", "maths", "info", "ia", "generic"] as const;

export const categoryInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  nameFr: requiredText(80, "Le nom FR"),
  nameEn: requiredText(80, "Le nom EN"),
  schematicStyle: z.enum(SCHEMATIC_STYLES, { error: "Style de schéma invalide." }),
  sortOrder: sortOrderSchema.default(0),
});

export const technologyInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  name: requiredText(60, "Le nom"),
});

/** Création rapide depuis le formulaire projet : seul le nom est fourni, le slug en est déduit. */
export const quickTechnologySchema = z.object({ name: requiredText(60, "Le nom") });

export const deleteTaxonomySchema = z.object({ id: idSchema, detach: z.boolean().default(false) });
