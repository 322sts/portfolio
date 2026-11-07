import { Icon } from "@/components/icons/Icon";
import { Field, fieldA11y, type FieldMessages } from "./Field";
import styles from "./Form.module.css";

type Common = FieldMessages & {
  id: string;
  label: React.ReactNode;
  /** Classe du conteneur <Field>. */
  className?: string;
};

type TextInputProps = Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

/** Champ texte (email, password, url, number…) avec label, aide et erreur. */
export function TextInput({ id, label, hint, error, className, required, ...rest }: TextInputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input id={id} required={required} className={styles.control} {...fieldA11y(id, { hint, error })} {...rest} />
    </Field>
  );
}

type TextAreaProps = Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> & {
  /** Police mono (Markdown, code). */
  mono?: boolean;
};

/** Zone de texte multiligne (redimensionnable verticalement). */
export function TextArea({ id, label, hint, error, className, required, mono, rows = 6, ...rest }: TextAreaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        className={`${styles.control} ${styles.textarea} ${mono ? styles.mono : ""}`}
        {...fieldA11y(id, { hint, error })}
        {...rest}
      />
    </Field>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = Common &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id" | "className" | "children"> & {
    options: SelectOption[];
    /** Option vide en tête (ex. « Toutes »). */
    placeholder?: string;
  };

/** Liste déroulante native (accessible et mobile par défaut), chevron au trait. */
export function Select({ id, label, hint, error, className, required, options, placeholder, ...rest }: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <span className={styles.selectWrap}>
        <select id={id} required={required} className={`${styles.control} ${styles.select}`} {...fieldA11y(id, { hint, error })} {...rest}>
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="sortDesc" size={14} className={styles.chevron} />
      </span>
    </Field>
  );
}

type CheckboxProps = FieldMessages &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className"> & {
    id: string;
    label: React.ReactNode;
    className?: string;
  };

/** Case à cocher carrée ; toute la ligne (≥ 44 px) est cliquable. */
export function Checkbox({ id, label, hint, error, className, ...rest }: CheckboxProps) {
  return (
    <div className={`${styles.checkField} ${className ?? ""}`} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className={styles.checkLabel}>
        <input id={id} type="checkbox" className={styles.checkbox} {...fieldA11y(id, { hint, error })} {...rest} />
        <span>{label}</span>
      </label>
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
