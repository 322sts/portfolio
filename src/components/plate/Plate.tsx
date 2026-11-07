import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { ProjectListItem } from "@/lib/queries/projects";
import { Badge } from "@/components/badge/Badge";
import { Schematic } from "@/components/schematic/Schematic";
import { svgToDataUrl } from "@/components/schematic/svg-data-url";
import styles from "./Plate.module.css";

/** Champs nécessaires à une planche (sous-ensemble de ProjectListItem). */
export type PlateProject = Pick<
  ProjectListItem,
  | "slug"
  | "plateNumber"
  | "title"
  | "summary"
  | "date"
  | "teamType"
  | "aiAssisted"
  | "categories"
  | "technologies"
  | "plateSvg"
>;

type Props = {
  project: PlateProject;
  /** « feature » : grande planche (1re de la PlateGrid). */
  size?: "feature" | "standard";
  /** Niveau du titre (défaut 3 : sous un h2 de section). */
  headingLevel?: 2 | 3;
  className?: string;
};

export const plateNumberLabel = (n: number) => String(n).padStart(2, "0");

/** Date au format plan « MM.AAAA » (UTC : les dates de projet sont le 1er du mois). */
export function formatPlateDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

/**
 * Planche de projet : en-tête PL. nn · TECHNO · SOLO/ÉQUIPE, schéma, pied titre + résumé + date.
 * Toute la planche est cliquable (lien étiré sur le titre) ; survol / focus révèlent les cotes.
 */
export async function Plate({ project, size = "standard", headingLevel = 3, className }: Props) {
  const t = await getTranslations("ui.plate");
  const tp = await getTranslations("projects");
  const Heading = headingLevel === 2 ? "h2" : "h3";

  const [firstTech, ...otherTechs] = project.technologies;
  const style = project.categories[0]?.schematicStyle ?? "generic";
  const dateIso = new Date(project.date).toISOString().slice(0, 10);

  return (
    <article className={`${styles.plate} ${className ?? ""}`} data-size={size}>
      <header className={styles.head}>
        <span className={styles.num}>
          {tp("plate")} {plateNumberLabel(project.plateNumber)}
        </span>
        {firstTech ? (
          <span className={styles.tech}>
            {firstTech.name}
            {otherTechs.length ? <span className={styles.more}> {t("more", { count: otherTechs.length })}</span> : null}
          </span>
        ) : null}
        <span>{project.teamType === "TEAM" ? t("team") : t("solo")}</span>
      </header>

      <div className={styles.figure}>
        <Schematic
          style={style}
          seed={project.slug}
          customSvgDataUrl={project.plateSvg ? svgToDataUrl(project.plateSvg) : null}
        />
        <span className={styles.ref} aria-hidden="true">
          {project.categories[0]?.slug.toUpperCase() ?? "GEN"}-{plateNumberLabel(project.plateNumber)}
        </span>
      </div>

      <footer className={styles.foot}>
        <Heading className={styles.title}>
          <Link
            href={{ pathname: "/projets/[slug]", params: { slug: project.slug } }}
            className={styles.link}
          >
            {project.title}
          </Link>
        </Heading>
        {project.summary ? <p className={styles.summary}>{project.summary}</p> : null}
        <div className={styles.meta}>
          <time dateTime={dateIso}>{formatPlateDate(project.date)}</time>
          {project.aiAssisted ? <Badge tone="mark">{t("aiBadge")}</Badge> : null}
        </div>
      </footer>
    </article>
  );
}
