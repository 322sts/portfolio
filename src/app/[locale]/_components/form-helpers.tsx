"use client";

import { useTranslations } from "next-intl";
import { Notice } from "@/components/notice/Notice";
import { HONEYPOT_FIELD } from "@/lib/security/form-fields";
import type { ErrorKey, FormState } from "@/lib/validation/action-result";
import styles from "./form-helpers.module.css";

/**
 * Aides communes aux formulaires publics (connexion, inscription, contact, commentaires).
 * Remplacent les composants locaux de l'agent 2 (connexion/form-parts.tsx) : le rendu
 * passe désormais par le design system (@/components/form, Notice). Logique inchangée.
 */

/** Erreur du champ `name` dans l'état d'une action (clé i18n), si présente. */
export function fieldError(state: FormState<unknown>, name: string): ErrorKey | undefined {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}

/** Traduit une clé d'erreur éventuelle (pour la prop `error` des champs). */
export function useErrorText() {
  const t = useTranslations();
  return (key: ErrorKey | undefined) => (key ? t(key) : undefined);
}

/** Message global d'erreur de l'action (role="alert" via Notice). */
export function FormAlert({ state, title }: { state: FormState<unknown>; title?: string }) {
  const t = useTranslations();
  if (!state || state.ok) return null;
  return (
    <Notice tone="error" title={title}>
      {t(state.error)}
    </Notice>
  );
}

/** Champ piège anti-robot (masqué, hors tabulation, ignoré par les aides techniques). */
export function Honeypot() {
  const t = useTranslations("auth");
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label htmlFor={`hp-${HONEYPOT_FIELD}`}>{t("honeypotLabel")}</label>
      <input
        id={`hp-${HONEYPOT_FIELD}`}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
