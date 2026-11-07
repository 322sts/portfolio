import type { ProjectFilters } from "@/lib/validation/project-filters";

/**
 * Filtres → query string de /projets (inverse de parseProjectFilters) :
 * les valeurs par défaut (tri=date, vue=planches, ia=false) sont omises pour des URL courtes.
 */
export function filtersToQuery(filters: Partial<ProjectFilters>): Record<string, string> {
  const q: Record<string, string> = {};
  if (filters.cat) q.cat = filters.cat;
  if (filters.tech) q.tech = filters.tech;
  if (filters.annee) q.annee = String(filters.annee);
  if (filters.ia) q.ia = "1";
  if (filters.equipe) q.equipe = filters.equipe;
  if (filters.tri && filters.tri !== "date") q.tri = filters.tri;
  if (filters.vue && filters.vue !== "planches") q.vue = filters.vue;
  return q;
}
