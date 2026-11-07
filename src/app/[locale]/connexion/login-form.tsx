"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button, TextInput } from "@/components/form";
import { login, loginWithGithub } from "@/server/actions/auth";
import type { FormState } from "@/lib/validation/action-result";
import { FormAlert, fieldError, useErrorText } from "../_components/form-helpers";
import styles from "./auth.module.css";

type Props = {
  callbackUrl: string;
  githubEnabled: boolean;
};

export function LoginForm({ callbackUrl, githubEnabled }: Props) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, null);
  // Conservé entre deux soumissions (React réinitialise le formulaire après l'action).
  const [email, setEmail] = useState("");

  return (
    <>
      <form action={formAction} className={styles.form} noValidate>
        <FormAlert state={state} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <TextInput
          id="field-email"
          name="email"
          type="email"
          label={t("email")}
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errorText(fieldError(state, "email"))}
        />
        <TextInput
          id="field-password"
          name="password"
          type="password"
          label={t("password")}
          autoComplete="current-password"
          required
          maxLength={128}
          error={errorText(fieldError(state, "password"))}
        />
        <div>
          <Button type="submit" loading={pending}>
            {pending ? t("submitting") : t("submitLogin")}
          </Button>
        </div>
      </form>

      {githubEnabled ? (
        <>
          <p className={styles.separator}>
            <span>{t("or")}</span>
          </p>
          <form action={loginWithGithub}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Button type="submit" variant="secondary">
              {t("withGithub")}
            </Button>
          </form>
        </>
      ) : null}
    </>
  );
}
