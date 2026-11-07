import styles from "./admin.module.css";

type Props = {
  /** Code de la feuille admin (ex. « A1 »), comme dans la navigation latérale. */
  code: string;
  title: string;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
};

/** En-tête de page admin : code, titre, chapeau et actions principales. */
export function PageHeader({ code, title, lede, actions }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <span className={styles.code}>{code}</span>
        <h1 className={styles.title}>{title}</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

/** Date courte FR (fuseau Europe/Paris). */
export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(d);
}

/** Mois / année d'un projet (dates stockées au 1er du mois, UTC). */
export function formatMonth(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}
