import styles from "./EmptyState.module.css";

type Props = {
  /** Phrase principale (ex. « Aucun projet ne correspond à ces filtres. »). */
  title: string;
  /** Précision facultative. */
  children?: React.ReactNode;
  /** Action facultative (lien, bouton). */
  action?: React.ReactNode;
  className?: string;
};

/** État vide : zone hachurée cadrée avec croix de repère — une « case vide » du plan. */
export function EmptyState({ title, children, action, className }: Props) {
  return (
    <div className={`${styles.empty} ${className ?? ""}`}>
      <svg className={styles.mark} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <rect x="0.5" y="0.5" width="39" height="39" />
        <path d="M0 0L40 40M40 0L0 40" />
      </svg>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {children ? <div className={styles.detail}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  );
}
