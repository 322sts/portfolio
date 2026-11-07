import styles from "./MarginNote.module.css";

type Props = {
  children: React.ReactNode;
  /** Repère court (ex. « N. 1 ») surligné en --mark. */
  label?: string;
  /** id pour un renvoi (CrossRef). */
  id?: string;
  /** Nom accessible du <aside> (défaut : le label). */
  ariaLabel?: string;
  className?: string;
};

/**
 * Annotation de marge : dans la colonne de droite d'une <Sheet withMargin> sur grand écran,
 * en encart dans le flux sur mobile. Placer le composant JUSTE AVANT le paragraphe annoté.
 */
export function MarginNote({ children, label, id, ariaLabel, className }: Props) {
  return (
    <aside
      id={id}
      className={`${styles.note} ${className ?? ""}`}
      aria-label={ariaLabel ?? label}
      data-xref={id ? "" : undefined}
    >
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
