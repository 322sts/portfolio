"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button, TextInput } from "@/components/form";
import { TurnstileWidget } from "@/lib/security/turnstile-widget";
import type { FormState } from "@/lib/validation/action-result";
import { register } from "@/server/actions/auth";
import { FormAlert, Honeypot, fieldError, useErrorText } from "../_components/form-helpers";
import styles from "../connexion/auth.module.css";

type Props = {
  callbackUrl: string;
  turnstileSiteKey: string | null;
};

export function RegisterForm({ callbackUrl, turnstileSiteKey }: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState<FormState, FormData>(register, null);
  const [values, setValues] = useState({ name: "", email: "" });

  return (
    <form action={formAction} className={styles.form} noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <TextInput
        id="field-name"
        name="name"
        type="text"
        label={t("nameOptional")}
        autoComplete="name"
        maxLength={80}
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        error={errorText(fieldError(state, "name"))}
      />
      <TextInput
        id="field-email"
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        inputMode="email"
        required
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errorText(fieldError(state, "email"))}
      />
      <TextInput
        id="field-password"
        name="password"
        type="password"
        label={t("password")}
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
        hint={t("passwordRules")}
        error={errorText(fieldError(state, "password"))}
      />
      <Honeypot />
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        language={locale}
        label={t("antiBot")}
        unavailableText={t("antiBotUnavailable")}
        resetKey={state}
      />
      <div>
        <Button type="submit" loading={pending}>
          {pending ? t("submitting") : t("submitRegister")}
        </Button>
      </div>
    </form>
  );
}
