"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button, TextArea, TextInput } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import { TurnstileWidget } from "@/lib/security/turnstile-widget";
import type { FormState } from "@/lib/validation/action-result";
import { sendContactMessage } from "@/server/actions/contact";
import { FormAlert, Honeypot, fieldError, useErrorText } from "../_components/form-helpers";
import styles from "./contact.module.css";

type Values = { name: string; email: string; subject: string; body: string };
type State = { result: FormState; values: Values; round: number };

const EMPTY: Values = { name: "", email: "", subject: "", body: "" };

function read(formData: FormData): Values {
  const s = (k: keyof Values) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return { name: s("name"), email: s("email"), subject: s("subject"), body: s("body") };
}

/** Formulaire de contact : action `sendContactMessage` (agent 2), Turnstile + champ piège. */
export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const t = useTranslations("contact");
  const ta = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (prev, formData) => {
      const result = await sendContactMessage(null, formData);
      // Saisie conservée en cas d'erreur (React réinitialise le formulaire après l'action).
      return { result, values: result.ok ? EMPTY : read(formData), round: prev.round + 1 };
    },
    { result: null, values: EMPTY, round: 0 },
  );
  const { result, values } = state;
  const err = (name: string) => errorText(fieldError(result, name));

  return (
    <form action={formAction} className={styles.form} key={state.round} noValidate>
      {result?.ok ? (
        <Notice tone="success" title={t("successTitle")}>
          {t("success")}
        </Notice>
      ) : null}
      <FormAlert state={result} title={t("errorTitle")} />

      <TextInput
        id="contact-nom"
        name="name"
        label={t("name")}
        autoComplete="name"
        required
        maxLength={100}
        defaultValue={values.name}
        error={err("name")}
      />
      <TextInput
        id="contact-email"
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={values.email}
        error={err("email")}
      />
      <TextInput
        id="contact-sujet"
        name="subject"
        label={t("subject")}
        required
        maxLength={150}
        defaultValue={values.subject}
        error={err("subject")}
      />
      <TextArea
        id="contact-message"
        name="body"
        label={t("message")}
        hint={t("messageHint")}
        required
        minLength={10}
        maxLength={5000}
        rows={8}
        defaultValue={values.body}
        error={err("body")}
      />
      <Honeypot />
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        language={locale}
        label={ta("antiBot")}
        unavailableText={ta("antiBotUnavailable")}
        resetKey={state.round}
      />
      <div>
        <Button type="submit" loading={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
