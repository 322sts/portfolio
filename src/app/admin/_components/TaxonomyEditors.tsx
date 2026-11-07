"use client";

import { useState, useTransition } from "react";
import { Button, Select, TextInput } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import type { AdminFieldErrors } from "@/lib/admin/result";
import { slugify } from "@/lib/admin/slug";
import { deleteCategory, deleteTechnology, saveCategory, saveTechnology } from "@/server/actions/admin/taxonomy";
import { ConfirmAction } from "./ActionButton";
import admin from "./admin.module.css";
import styles from "./form.module.css";

const STYLE_OPTIONS = [
  { value: "finance", label: "finance — courbe de prix" },
  { value: "maths", label: "maths — construction géométrique" },
  { value: "info", label: "info — blocs reliés" },
  { value: "ia", label: "ia — réseau de nœuds" },
  { value: "generic", label: "generic — grille et croix" },
];

type Feedback = { tone: "success" | "error"; text: string } | null;

export type CategoryValues = {
  id?: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  schematicStyle: string;
  sortOrder: number;
  projectCount?: number;
};

/** Formulaire d'une catégorie (création si pas d'id) ; suppression avec confirmation et détachement. */
export function CategoryEditor({ initial }: { initial: CategoryValues }) {
  const isNew = !initial.id;
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, start] = useTransition();
  const p = (k: string) => `${initial.id ?? "new"}-${k}`;
  const used = initial.projectCount ?? 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setFeedback(null);
      const r = await saveCategory({ ...v, id: initial.id });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFeedback({ tone: "error", text: r.error });
        return;
      }
      setErrors({});
      setFeedback({ tone: "success", text: isNew ? `Catégorie « ${v.nameFr} » créée.` : "Enregistré." });
      if (isNew) {
        setV({ slug: "", nameFr: "", nameEn: "", schematicStyle: "generic", sortOrder: 0 });
        setSlugTouched(false);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className={admin.panel} aria-label={isNew ? "Nouvelle catégorie" : `Catégorie ${initial.nameFr}`}>
      <div className={admin.panelHead}>
        <strong>{isNew ? "Nouvelle catégorie" : initial.nameFr || initial.slug}</strong>
        {!isNew ? <span className={admin.meta}>{used} projet(s)</span> : null}
      </div>
      <div className={styles.tableForm}>
        <TextInput
          id={p("nameFr")}
          label="Nom FR"
          required
          value={v.nameFr}
          onChange={(e) => {
            const nameFr = e.target.value;
            setV((s) => ({ ...s, nameFr, slug: slugTouched ? s.slug : slugify(nameFr) }));
          }}
          error={errors.nameFr}
        />
        <TextInput id={p("nameEn")} label="Nom EN" required value={v.nameEn} onChange={(e) => setV((s) => ({ ...s, nameEn: e.target.value }))} error={errors.nameEn} lang="en" />
        <TextInput
          id={p("slug")}
          label="Slug"
          required
          value={v.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setV((s) => ({ ...s, slug: e.target.value.toLowerCase() }));
          }}
          error={errors.slug}
          hint="Utilisé dans les filtres (?cat=…)."
          spellCheck={false}
        />
        <Select id={p("style")} label="Style de schéma" options={STYLE_OPTIONS} value={v.schematicStyle} onChange={(e) => setV((s) => ({ ...s, schematicStyle: e.target.value }))} error={errors.schematicStyle} />
        <TextInput id={p("order")} label="Ordre" type="number" inputMode="numeric" step={1} value={String(v.sortOrder)} onChange={(e) => setV((s) => ({ ...s, sortOrder: Number(e.target.value) }))} error={errors.sortOrder} />
      </div>
      <div className={styles.uploadTools}>
        <Button type="submit" size="sm" loading={pending}>
          {pending ? "Enregistrement…" : isNew ? "Créer" : "Enregistrer"}
        </Button>
        {!isNew && initial.id ? (
          <ConfirmAction
            action={deleteCategory.bind(null, { id: initial.id, detach: used > 0 })}
            question={used > 0 ? `${used} projet(s) utilisent cette catégorie : les en détacher puis la supprimer ?` : "Supprimer cette catégorie ?"}
            confirmLabel={used > 0 ? `Détacher ${used} projet(s) et supprimer` : "Confirmer la suppression"}
          >
            Supprimer
          </ConfirmAction>
        ) : null}
      </div>
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
    </form>
  );
}

export type TechnologyValues = { id?: string; slug: string; name: string; projectCount?: number };

export function TechnologyEditor({ initial }: { initial: TechnologyValues }) {
  const isNew = !initial.id;
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, start] = useTransition();
  const p = (k: string) => `${initial.id ?? "new"}-${k}`;
  const used = initial.projectCount ?? 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setFeedback(null);
      const r = await saveTechnology({ ...v, id: initial.id });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFeedback({ tone: "error", text: r.error });
        return;
      }
      setErrors({});
      setFeedback({ tone: "success", text: isNew ? `Technologie « ${v.name} » créée.` : "Enregistré." });
      if (isNew) {
        setV({ slug: "", name: "" });
        setSlugTouched(false);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className={admin.panel} aria-label={isNew ? "Nouvelle technologie" : `Technologie ${initial.name}`}>
      <div className={styles.tableForm}>
        <TextInput
          id={p("name")}
          label={isNew ? "Nouvelle technologie" : "Nom"}
          required
          value={v.name}
          onChange={(e) => {
            const name = e.target.value;
            setV((s) => ({ ...s, name, slug: slugTouched ? s.slug : slugify(name) }));
          }}
          error={errors.name}
        />
        <TextInput
          id={p("slug")}
          label="Slug"
          required
          value={v.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setV((s) => ({ ...s, slug: e.target.value.toLowerCase() }));
          }}
          error={errors.slug}
          spellCheck={false}
        />
        <div className={styles.uploadTools}>
          {!isNew ? <span className={admin.meta}>{used} projet(s)</span> : null}
          <Button type="submit" size="sm" loading={pending}>
            {pending ? "Enregistrement…" : isNew ? "Créer" : "Enregistrer"}
          </Button>
          {!isNew && initial.id ? (
            <ConfirmAction
              action={deleteTechnology.bind(null, { id: initial.id, detach: used > 0 })}
              question={used > 0 ? `${used} projet(s) l'utilisent : les en détacher puis la supprimer ?` : "Supprimer cette technologie ?"}
              confirmLabel={used > 0 ? `Détacher ${used} projet(s) et supprimer` : "Confirmer la suppression"}
            >
              Supprimer
            </ConfirmAction>
          ) : null}
        </div>
      </div>
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
    </form>
  );
}
