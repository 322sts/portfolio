"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button, TextInput } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import type { FormState } from "@/lib/validation/action-result";
import { changePassword } from "@/server/actions/account";
import { FormAlert, fieldError, useErrorText } from "../_components/form-helpers";
import styles from "../connexion/auth.module.css";

export function PasswordForm() {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, null);

  return (
    // Après un succès, React vide les champs non contrôlés du formulaire (aucun mot de passe ne reste affiché).
    <form action={formAction} className={styles.form} noValidate>
      {state?.ok ? <Notice tone="success">{t("passwordChanged")}</Notice> : <FormAlert state={state} />}
      <TextInput
        id="field-current-password"
        name="currentPassword"
        type="password"
        label={t("currentPassword")}
        autoComplete="current-password"
        required
        maxLength={128}
        error={errorText(fieldError(state, "currentPassword"))}
      />
      <TextInput
        id="field-new-password"
        name="newPassword"
        type="password"
        label={t("newPassword")}
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
        hint={tAuth("passwordRules")}
        error={errorText(fieldError(state, "newPassword"))}
      />
      <TextInput
        id="field-confirm-password"
        name="confirmPassword"
        type="password"
        label={t("confirmPassword")}
        autoComplete="new-password"
        required
        maxLength={128}
        error={errorText(fieldError(state, "confirmPassword"))}
      />
      <div>
        <Button type="submit" loading={pending}>
          {pending ? t("passwordSaving") : t("passwordSubmit")}
        </Button>
      </div>
    </form>
  );
}
