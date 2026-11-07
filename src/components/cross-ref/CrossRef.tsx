import styles from "./CrossRef.module.css";

type Props = {
  /** id de la cible (Figure, MarginNote, titre…) — la cible doit porter data-xref pour le surlignage. */
  target: string;
  /** Texte du renvoi (ex. « fig. 2 », « (1) »). */
  children: React.ReactNode;
  className?: string;
};

/**
 * Renvoi cliquable : ancre vers la cible, surlignée brièvement via :target (CSS pur, sans JS).
 * Les composants Figure et MarginNote posent data-xref automatiquement quand ils ont un id.
 */
export function CrossRef({ target, children, className }: Props) {
  return (
    <a href={`#${target}`} className={`${styles.ref} ${className ?? ""}`}>
      {children}
    </a>
  );
}
