import styles from "./Dimension.module.css";

type Props = {
  /** Valeur affichée au milieu de la cote (ex. « 1 240 mm », « 2026 »). */
  value: React.ReactNode;
  /** horizontal (défaut) ou vertical (hauteur fixée par le parent). */
  orientation?: "horizontal" | "vertical";
  /** Couleur : ink (défaut) ou mark (cote surlignée). */
  tone?: "ink" | "mark";
  /** Si la cote porte une information, la rendre lisible ; sinon décorative (aria-hidden). */
  decorative?: boolean;
  className?: string;
};

/**
 * Ligne de cote : attaches aux extrémités, flèches pleines, valeur au centre.
 * En HTML/CSS (pas de SVG étiré) : s'adapte à n'importe quelle largeur sans déformer les flèches.
 */
export function Dimension({ value, orientation = "horizontal", tone = "ink", decorative = false, className }: Props) {
  return (
    <div
      className={`${styles.dim} ${className ?? ""}`}
      data-orientation={orientation}
      data-tone={tone}
      aria-hidden={decorative || undefined}
    >
      <span className={styles.arrowStart} aria-hidden="true" />
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.value}>{value}</span>
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.arrowEnd} aria-hidden="true" />
    </div>
  );
}
