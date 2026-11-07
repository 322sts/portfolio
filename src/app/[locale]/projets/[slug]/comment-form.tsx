"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button, TextArea } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import type { FormState } from "@/lib/validation/action-result";
import { addComment } from "@/server/actions/comments";
import { FormAlert, fieldError, useErrorText } from "../../_components/form-helpers";
import styles from "./project.module.css";

type State = { result: FormState<{ id: string }>; draft: string; round: number };

/** Formulaire de commentaire (texte brut) : publié seulement après modération. */
export function CommentForm({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (prev, formData) => {
      const result = await addComment(null, formData);
      // Brouillon conservé en cas d'erreur, vidé après un envoi réussi.
      const draft = result.ok ? "" : String(formData.get("body") ?? "");
      return { result, draft, round: prev.round + 1 };
    },
    { result: null, draft: "", round: 0 },
  );
  const { result } = state;

  return (
    <form action={formAction} className={styles.commentForm} key={state.round} noValidate>
      {result?.ok ? <Notice tone="success">{t("commentPending")}</Notice> : null}
      <FormAlert state={result && !result.ok && !result.fieldErrors ? result : null} />
      <input type="hidden" name="projectId" value={projectId} />
      <TextArea
        id="commentaire"
        name="body"
        label={t("commentLabel")}
        hint={t("commentHint")}
        error={errorText(fieldError(result, "body"))}
        required
        minLength={2}
        maxLength={2000}
        rows={5}
        defaultValue={state.draft}
      />
      <div>
        <Button type="submit" loading={pending}>
          {t("commentSubmit")}
        </Button>
      </div>
    </form>
  );
}
