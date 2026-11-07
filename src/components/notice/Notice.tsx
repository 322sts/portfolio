import { Icon } from "@/components/icons/Icon";
import styles from "./Notice.module.css";

type Props = {
  tone: "success" | "error" | "info";
  /** Titre court optionnel (mono capitales). */
  title?: string;
  children: React.ReactNode;
  /** id (pour aria-describedby d'un formulaire). */
  id?: string;
  className?: string;
};

/**
 * Message de retour : succès (role="status", poli) ou erreur (role="alert", immédiat).
 * Icône + texte : jamais la couleur seule.
 */
export function Notice({ tone, title, children, id, className }: Props) {
  const role = tone === "error" ? "alert" : "status";
  const icon = tone === "success" ? "check" : tone === "error" ? "alert" : "crosshair";
  return (
    <div id={id} role={role} className={`${styles.notice} ${className ?? ""}`} data-tone={tone}>
      <Icon name={icon} size={18} className={styles.icon} />
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
