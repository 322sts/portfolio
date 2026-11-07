"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/form";
import type { AdminResult } from "@/lib/admin/result";
import styles from "./admin.module.css";

type BoundAction = () => Promise<AdminResult<unknown>>;

type Props = {
  /** Server Action pré-liée (ex. `setProjectStatus.bind(null, id, "PUBLISHED")`). */
  action: BoundAction;
  children: React.ReactNode;
  variant?: ButtonVariant;
  /** Libellé pendant l'exécution. */
  pendingLabel?: string;
  /** Redirection après succès. */
  redirectTo?: string;
  "aria-label"?: string;
  disabled?: boolean;
};

/** Bouton qui exécute une action admin, avec état « en cours » et erreur affichée sur place. */
export function ActionButton({ action, children, variant = "secondary", pendingLabel, redirectTo, disabled, ...rest }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className={styles.rowActions}>
      <Button
        size="sm"
        variant={variant}
        loading={pending}
        disabled={disabled}
        aria-label={rest["aria-label"]}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await action();
            if (!r.ok) setError(r.error);
            else if (redirectTo) router.push(redirectTo);
          })
        }
      >
        {pending && pendingLabel ? pendingLabel : children}
      </Button>
      {error ? (
        <span role="alert" className={styles.inlineError}>
          {error}
        </span>
      ) : null}
    </span>
  );
}

type ConfirmProps = {
  action: BoundAction;
  /** Libellé du bouton déclencheur (ex. « Supprimer »). */
  children: React.ReactNode;
  /** Question affichée dans la page (pas de confirm() du navigateur). */
  question: string;
  confirmLabel?: string;
  redirectTo?: string;
  "aria-label"?: string;
};

/**
 * Suppression avec confirmation DANS la page : 1er clic → question + « Confirmer » (focus) / « Annuler ».
 * Échap annule et rend le focus au bouton déclencheur.
 */
export function ConfirmAction({ action, children, question, confirmLabel = "Confirmer la suppression", redirectTo, ...rest }: ConfirmProps) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  const cancel = () => {
    setOpen(false);
    setError(null);
    requestAnimationFrame(() => triggerRef.current?.querySelector("button")?.focus());
  };

  if (!open) {
    return (
      <span ref={triggerRef} className={styles.rowActions}>
        <Button size="sm" variant="danger" aria-label={rest["aria-label"]} onClick={() => setOpen(true)}>
          {children}
        </Button>
      </span>
    );
  }

  return (
    <span
      className={styles.confirm}
      role="group"
      aria-label={question}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          cancel();
        }
      }}
    >
      <span className={styles.confirmText}>{question}</span>
      <Button
        size="sm"
        variant="danger"
        autoFocus
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await action();
            if (!r.ok) setError(r.error);
            else if (redirectTo) router.push(redirectTo);
            else setOpen(false);
          })
        }
      >
        {pending ? "Suppression…" : confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
        Annuler
      </Button>
      {error ? (
        <span role="alert" className={styles.inlineError}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
