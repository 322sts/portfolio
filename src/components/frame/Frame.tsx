import { CursorCoords } from "./CursorCoords";
import styles from "./Frame.module.css";

const COLUMNS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const ROWS = ["A", "B", "C", "D", "E", "F"];

type Props = {
  children: React.ReactNode;
  /** Affiche les coordonnées du curseur (desktop uniquement). Défaut : true. */
  coords?: boolean;
  className?: string;
};

/**
 * Cadre de page façon plan d'ingénieur : double filet, repères de zones (1–8 / A–F)
 * dans la marge, coordonnées du curseur en haut à droite. Purement décoratif autour du contenu.
 */
export function Frame({ children, coords = true, className }: Props) {
  return (
    <div className={`${styles.frame} ${className ?? ""}`}>
      <div className={styles.zonesTop} aria-hidden="true">
        {COLUMNS.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className={styles.zonesLeft} aria-hidden="true">
        {ROWS.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      <div className={styles.zonesRight} aria-hidden="true">
        {ROWS.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      {coords ? <CursorCoords /> : null}
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
