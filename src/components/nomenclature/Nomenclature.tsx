import type { ProjectListItem } from "@/lib/queries/projects";
import { NomenclatureTable, type NomenclatureRow } from "./NomenclatureTable";

type Props = {
  projects: Pick<
    ProjectListItem,
    "slug" | "plateNumber" | "title" | "categories" | "technologies" | "teamType" | "date" | "aiAssisted"
  >[];
  className?: string;
};

/**
 * Vue « Nomenclature » des projets : tableau triable (PL., Projet, Catégorie, Stack, Équipe, Date, IA).
 * Server Component : ne sérialise vers le client que les champs utiles.
 */
export function Nomenclature({ projects, className }: Props) {
  const rows: NomenclatureRow[] = projects.map((p) => ({
    slug: p.slug,
    plateNumber: p.plateNumber,
    title: p.title,
    category: p.categories.map((c) => c.name).join(", "),
    stack: p.technologies.map((t) => t.name),
    team: p.teamType === "TEAM" ? "team" : "solo",
    date: new Date(p.date).toISOString().slice(0, 7),
    ai: p.aiAssisted,
  }));
  return <NomenclatureTable rows={rows} className={className} />;
}
