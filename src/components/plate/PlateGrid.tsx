import { getTranslations } from "next-intl/server";
import { Plate, type PlateProject } from "./Plate";
import styles from "./PlateGrid.module.css";

type Props = {
  projects: PlateProject[];
  /** Niveau des titres de planche (défaut 3). */
  headingLevel?: 2 | 3;
  /** Nom accessible de la liste (défaut « Planches de projets »). */
  label?: string;
  className?: string;
};

/**
 * Mise en page éditoriale des planches sur une trame de 12 colonnes (pas de 20 px) :
 * la 1re planche est grande (7 col. × 2 rangs), les deux suivantes s'empilent à côté,
 * puis les rangs alternent 5/7 et 7/5. Une colonne unique sur mobile.
 */
export async function PlateGrid({ projects, headingLevel = 3, label, className }: Props) {
  const t = await getTranslations("ui.plates");
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <p className={styles.count} aria-hidden="true">
        <span>{t("count", { count: projects.length })}</span>
        <span className={styles.rule} />
      </p>
      <ol role="list" className={styles.grid} aria-label={label ?? t("label")}>
        {projects.map((project, i) => (
          <li key={project.slug} className={styles.item}>
            <Plate project={project} size={i === 0 ? "feature" : "standard"} headingLevel={headingLevel} />
          </li>
        ))}
      </ol>
    </div>
  );
}
