import styles from "./Form.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

/** Classes d'un bouton, réutilisables sur un <Link> ou un <a> (« lien-bouton »). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return [styles.button, styles[`btn-${variant}`], size === "sm" ? styles.btnSm : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Action en cours : désactive le bouton et pose aria-busy (garder le libellé explicite). */
  loading?: boolean;
};

/**
 * Bouton « plan » : rectangle à filet, libellé mono en capitales.
 * ATTENTION : type="button" par défaut — passer type="submit" dans les formulaires.
 */
export function Button({ variant = "primary", size = "md", loading = false, className, type, disabled, children, ...rest }: Props) {
  return (
    <button
      type={type ?? "button"}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
