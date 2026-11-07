"use client";

import { useState, useTransition } from "react";
import { Button, TextInput } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import type { AdminFieldErrors } from "@/lib/admin/result";
import { saveProfile } from "@/server/actions/admin/profile";
import { MarkdownEditor } from "../_components/MarkdownEditor";
import { UploadField } from "../_components/UploadField";
import styles from "../_components/form.module.css";

export type ProfileValues = {
  bioFr: string;
  bioEn: string;
  githubUrl: string;
  linkedinUrl: string;
  email: string;
  cvUrl: string;
  photoUrl: string;
};

export function ProfileForm({ initial, cloudinary }: { initial: ProfileValues; cloudinary: boolean }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProfileValues>(k: K, value: ProfileValues[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setFeedback(null);
      const r = await saveProfile(v);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFeedback({ tone: "error", text: r.error });
        return;
      }
      setErrors({});
      setFeedback({ tone: "success", text: "Profil enregistré. Les pages publiques sont mises à jour." });
    });
  }

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      {feedback ? (
        <Notice tone={feedback.tone} title={feedback.tone === "success" ? "Enregistré" : "Non enregistré"}>
          {feedback.text}
        </Notice>
      ) : null}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Biographie</legend>
        <MarkdownEditor id="pr-bioFr" label="Bio FR" value={v.bioFr} onChange={(x) => set("bioFr", x)} error={errors.bioFr} rows={8} lang="fr" />
        <MarkdownEditor id="pr-bioEn" label="Bio EN" value={v.bioEn} onChange={(x) => set("bioEn", x)} error={errors.bioEn} rows={8} lang="en" />
        {!v.bioEn.trim() ? <p className={styles.warn}>Bio anglaise vide.</p> : null}
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Coordonnées</legend>
        <div className={styles.row}>
          <TextInput id="pr-email" label="Email" type="email" required value={v.email} onChange={(e) => set("email", e.target.value)} error={errors.email} autoComplete="email" />
          <TextInput id="pr-github" label="GitHub" type="url" required value={v.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} error={errors.githubUrl} placeholder="https://github.com/…" />
          <TextInput id="pr-linkedin" label="LinkedIn" type="url" required value={v.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} error={errors.linkedinUrl} placeholder="https://www.linkedin.com/in/…" />
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Fichiers</legend>
        <UploadField id="pr-photo" label="Photo" kind="profilePhoto" value={v.photoUrl} onChange={(x) => set("photoUrl", x)} error={errors.photoUrl} cloudinary={cloudinary} />
        <UploadField id="pr-cv" label="CV (PDF)" kind="cv" value={v.cvUrl} onChange={(x) => set("cvUrl", x)} error={errors.cvUrl} cloudinary={cloudinary} preview="link" />
      </fieldset>
      <div className={styles.saveBar}>
        <span className={styles.meta} aria-live="polite">
          {pending ? "Enregistrement…" : ""}
        </span>
        <Button type="submit" loading={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
