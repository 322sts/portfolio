import styles from "./Sheet.module.css";

type Props = {
  children: React.ReactNode;
  /** Élément racine (défaut article). */
  as?: "article" | "div" | "section";
  /** Réserve une colonne de marge à droite (≥ 1100 px) pour les MarginNote. */
  withMargin?: boolean;
  /** Mention en haut de la feuille (ex. « PL. 01 — CALQUE »), décorative. */
  stamp?: string;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * Feuille de calque pour les pages de lecture : en thème sombre, une feuille claire posée
 * sur le plan bleu (palette calque re-déclarée via data-surface="light") ; en thème clair,
 * la page elle-même (la feuille se fond dans le fond).
 */
export function Sheet({ children, as: Tag = "article", withMargin = false, stamp, className, ...rest }: Props) {
  return (
    <Tag
      className={`${styles.sheet} ${withMargin ? styles.withMargin : ""} ${className ?? ""}`}
      data-surface="light"
      {...rest}
    >
      <span className={styles.corners} aria-hidden="true" />
      {stamp ? (
        <span className={styles.stamp} aria-hidden="true">
          {stamp}
        </span>
      ) : null}
      <div className={styles.content}>{children}</div>
    </Tag>
  );
}
