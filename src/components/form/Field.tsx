import { Icon } from "@/components/icons/Icon";
import styles from "./Form.module.css";

export type FieldMessages = {
  /** Aide affichée sous le champ (id `${id}-aide`). */
  hint?: React.ReactNode;
  /** Erreur de validation (id `${id}-erreur`) ; pose aria-invalid sur le contrôle. */
  error?: string | null;
};

/** Attributs ARIA à poser sur le contrôle d'un <Field> (aria-describedby / aria-invalid). */
export function fieldA11y(id: string, { hint, error }: FieldMessages) {
  const describedBy = [error ? `${id}-erreur` : null, hint ? `${id}-aide` : null].filter(Boolean).join(" ");
  return {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? (true as const) : undefined,
  };
}

type Props = FieldMessages & {
  /** id du contrôle (relie le <label>). */
  id: string;
  label: React.ReactNode;
  required?: boolean;
  /** Le contrôle ; utiliser fieldA11y(id, …) pour ses attributs ARIA. */
  children: React.ReactNode;
  className?: string;
};

/** Champ de formulaire : label mono capitales, contrôle, aide, erreur reliée par aria-describedby. */
export function Field({ id, label, hint, error, required, children, className }: Props) {
  return (
    <div className={`${styles.field} ${className ?? ""}`} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-erreur`} className={styles.error}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-aide`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
