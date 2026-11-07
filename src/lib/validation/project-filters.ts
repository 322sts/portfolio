import { z } from "zod";

/**
 * Filtres de la liste des projets, lus depuis la query string (SPEC §3) :
 * `cat`, `tech`, `annee`, `ia=1`, `equipe=solo|team`, `tri=date|titre`, `vue=planches|nomenclature`.
 *
 * Toute valeur invalide est ignorée (remplacée par la valeur par défaut)
 * plutôt que de provoquer une erreur : une URL bricolée ne casse pas la page.
 */

// searchParams Next : une clé peut être absente, une chaîne ou un tableau (clé répétée).
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,64}$/);

export const projectFiltersSchema = z.object({
  cat: z.preprocess(first, slug.optional()).catch(undefined),
  tech: z.preprocess(first, slug.optional()).catch(undefined),
  annee: z
    .preprocess(first, z.coerce.number().int().min(1990).max(2100).optional())
    .catch(undefined),
  ia: z.preprocess((v) => first(v) === "1", z.boolean()).catch(false),
  equipe: z.preprocess(first, z.enum(["solo", "team"]).optional()).catch(undefined),
  tri: z.preprocess(first, z.enum(["date", "titre"]).default("date")).catch("date"),
  vue: z
    .preprocess(first, z.enum(["planches", "nomenclature"]).default("planches"))
    .catch("planches"),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Analyse les searchParams d'une page en filtres sûrs (jamais d'exception). */
export function parseProjectFilters(params: RawSearchParams | undefined): ProjectFilters {
  return projectFiltersSchema.parse(params ?? {});
}
