"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, buttonClassName, Checkbox, Select, TextArea, TextInput } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import { slugify } from "@/lib/admin/slug";
import type { AdminFieldErrors } from "@/lib/admin/result";
import { quickCreateTechnology } from "@/server/actions/admin/taxonomy";
import { deleteProject, sanitizePlateSvg, saveProject } from "@/server/actions/admin/projects";
import { ConfirmAction } from "../../_components/ActionButton";
import { MarkdownEditor } from "../../_components/MarkdownEditor";
import { UploadField } from "../../_components/UploadField";
import styles from "../../_components/form.module.css";

export type TranslationValues = {
  title: string;
  summary: string;
  objectives: string;
  body: string;
  results: string;
  aiMethod: string;
};

export type MediaValues = {
  key: string;
  url: string;
  altFr: string;
  altEn: string;
  captionFr: string;
  captionEn: string;
};

export type ProjectFormValues = {
  id?: string;
  slug: string;
  month: string;
  teamType: "SOLO" | "TEAM";
  aiAssisted: boolean;
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  categoryIds: string[];
  technologyIds: string[];
  githubUrl: string;
  demoUrl: string;
  pdfUrl: string;
  coverImageUrl: string;
  plateSvg: string | null;
  media: MediaValues[];
  fr: TranslationValues;
  en: TranslationValues;
};

type Option = { id: string; name: string };

type Props = {
  initial: ProjectFormValues;
  categories: Option[];
  technologies: Option[];
  cloudinary: boolean;
  /** Notice affichée au chargement (ex. après création + redirection). */
  flash?: string | null;
};

const LOCALES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

const TR_FIELDS: Array<{ key: keyof TranslationValues; label: string; kind: "input" | "area" | "md" }> = [
  { key: "title", label: "Titre", kind: "input" },
  { key: "summary", label: "Résumé (planche, liste)", kind: "area" },
  { key: "objectives", label: "Objectifs", kind: "md" },
  { key: "body", label: "Corps (Markdown)", kind: "md" },
  { key: "results", label: "Résultats", kind: "md" },
  { key: "aiMethod", label: "Méthode IA", kind: "md" },
];

const newKey = () => Math.random().toString(36).slice(2, 10);

function isEnEmpty(en: TranslationValues): boolean {
  return Object.values(en).every((v) => v.trim() === "");
}

/** Clé d'erreur serveur (`fr.title`, `media.0.altFr`) → id du champ dans la page. */
function fieldIdFor(key: string): string {
  return `p-${key.replace(/\./g, "-")}`;
}

const FIELD_LABELS: Record<string, string> = {
  slug: "Slug",
  month: "Date",
  teamType: "Solo / équipe",
  status: "Statut",
  categoryIds: "Catégories",
  technologyIds: "Technologies",
  githubUrl: "Lien GitHub",
  demoUrl: "Lien démo",
  pdfUrl: "Lien PDF",
  coverImageUrl: "Image de couverture",
  plateSvg: "SVG de planche",
};

function labelForError(key: string): string {
  const [head, second, third] = key.split(".");
  if (head === "fr" || head === "en") {
    const f = TR_FIELDS.find((x) => x.key === second);
    return `${f?.label ?? second} (${head.toUpperCase()})`;
  }
  if (head === "media") {
    const names: Record<string, string> = { url: "URL", altFr: "Texte alternatif FR", altEn: "Texte alternatif EN", captionFr: "Légende FR", captionEn: "Légende EN" };
    return `Média ${Number(second) + 1} — ${names[third] ?? third}`;
  }
  return FIELD_LABELS[head] ?? key;
}

export function ProjectForm({ initial, categories, technologies: initialTechs, cloudinary, flash }: Props) {
  const router = useRouter();
  const [v, setV] = useState<ProjectFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [tab, setTab] = useState<"fr" | "en">("fr");
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(flash ?? null);
  const [dirty, setDirty] = useState(false);
  const [savedStatus, setSavedStatus] = useState(initial.status);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [pending, start] = useTransition();
  const [techs, setTechs] = useState<Option[]>(initialTechs);
  const [newTech, setNewTech] = useState("");
  const [techMsg, setTechMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [techPending, startTech] = useTransition();
  const [svgMsg, setSvgMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [svgPending, startSvg] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);

  const enEmpty = isEnEmpty(v.en);
  const isNew = !v.id;

  // Prévenir la perte de saisie en quittant la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function updateTr(locale: "fr" | "en", key: keyof TranslationValues, value: string) {
    setV((prev) => {
      const next = { ...prev, [locale]: { ...prev[locale], [key]: value } };
      if (locale === "fr" && key === "title" && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setDirty(true);
  }

  function updateMedia(index: number, patch: Partial<MediaValues>) {
    setV((prev) => ({ ...prev, media: prev.media.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));
    setDirty(true);
  }

  function moveMedia(index: number, delta: -1 | 1) {
    setV((prev) => {
      const media = [...prev.media];
      const j = index + delta;
      if (j < 0 || j >= media.length) return prev;
      [media[index], media[j]] = [media[j], media[index]];
      return { ...prev, media };
    });
    setDirty(true);
  }

  function toggle(list: "categoryIds" | "technologyIds", id: string, checked: boolean) {
    setV((prev) => ({ ...prev, [list]: checked ? [...prev[list], id] : prev[list].filter((x) => x !== id) }));
    setDirty(true);
  }

  const err = (key: string) => errors[key] ?? null;

  const payload = useMemo(
    () => ({
      id: v.id,
      slug: v.slug,
      month: v.month,
      teamType: v.teamType,
      aiAssisted: v.aiAssisted,
      status: v.status,
      featured: v.featured,
      categoryIds: v.categoryIds,
      technologyIds: v.technologyIds,
      githubUrl: v.githubUrl,
      demoUrl: v.demoUrl,
      pdfUrl: v.pdfUrl,
      coverImageUrl: v.coverImageUrl,
      plateSvg: v.plateSvg,
      media: v.media.map(({ url, altFr, altEn, captionFr, captionEn }) => ({ url, altFr, altEn, captionFr, captionEn })),
      fr: v.fr,
      en: v.en,
    }),
    [v],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setFormError(null);
      setSuccess(null);
      const r = await saveProject(payload);
      if (!r.ok) {
        // La saisie est conservée (état local) ; on affiche les erreurs et on bascule sur l'onglet fautif.
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        const keys = Object.keys(r.fieldErrors ?? {});
        if (keys.some((k) => k.startsWith("fr."))) setTab("fr");
        else if (keys.some((k) => k.startsWith("en."))) setTab("en");
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setErrors({});
      setDirty(false);
      setSavedStatus(r.data.status);
      setSavedSlug(r.data.slug);
      const note = r.data.enEmpty ? " Traduction anglaise vide : le site anglais affichera le texte français." : "";
      if (isNew) {
        router.replace(`/admin/projets/${r.data.id}?enregistre=${r.data.status === "PUBLISHED" ? "publie" : "brouillon"}`);
        return;
      }
      setSuccess(`Projet enregistré (${r.data.status === "PUBLISHED" ? "publié" : "brouillon"}).${note}`);
      router.refresh();
      requestAnimationFrame(() => summaryRef.current?.focus());
    });
  }

  function addTech() {
    const name = newTech.trim();
    if (!name) return;
    startTech(async () => {
      setTechMsg(null);
      const r = await quickCreateTechnology({ name });
      if (!r.ok) {
        setTechMsg({ tone: "error", text: r.fieldErrors?.name ?? r.error });
        return;
      }
      const t = r.data;
      setTechs((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, { id: t.id, name: t.name }].sort((a, b) => a.name.localeCompare(b.name))));
      setV((prev) => (prev.technologyIds.includes(t.id) ? prev : { ...prev, technologyIds: [...prev.technologyIds, t.id] }));
      setDirty(true);
      setNewTech("");
      setTechMsg({ tone: "ok", text: t.existed ? `« ${t.name} » existait déjà : sélectionnée.` : `« ${t.name} » créée et sélectionnée.` });
    });
  }

  function onSvgFile(file: File | undefined) {
    if (!file) return;
    if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
      setSvgMsg({ tone: "error", text: "Fichier .svg attendu." });
      return;
    }
    if (file.size > 500_000) {
      setSvgMsg({ tone: "error", text: "SVG trop lourd (500 Ko max)." });
      return;
    }
    startSvg(async () => {
      setSvgMsg(null);
      const text = await file.text();
      const r = await sanitizePlateSvg(text);
      if (!r.ok) {
        setSvgMsg({ tone: "error", text: r.error });
        return;
      }
      update("plateSvg", r.data.svg);
      setSvgMsg({
        tone: "ok",
        text: r.data.removedBytes > 0 ? "SVG importé et nettoyé (éléments non sûrs retirés)." : "SVG importé.",
      });
    });
  }

  const errorKeys = Object.keys(errors);

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-describedby={formError ? "p-erreurs" : undefined}>
      <div ref={summaryRef} tabIndex={-1}>
        {formError ? (
          <Notice tone="error" title="Non enregistré" id="p-erreurs">
            <p>{formError}</p>
            {errorKeys.length ? (
              <ul>
                {errorKeys.map((k) => (
                  <li key={k}>
                    <a
                      href={`#${fieldIdFor(k)}`}
                      onClick={() => {
                        if (k.startsWith("fr.")) setTab("fr");
                        if (k.startsWith("en.")) setTab("en");
                      }}
                    >
                      {labelForError(k)}
                    </a>{" "}
                    : {errors[k]}
                  </li>
                ))}
              </ul>
            ) : null}
          </Notice>
        ) : null}
        {success ? (
          <Notice tone="success" title="Enregistré">
            <p>{success}</p>
            {v.id ? (
              <p>
                <Link href={`/admin/projets/${v.id}/apercu`}>Voir l&apos;aperçu</Link>
                {savedStatus === "PUBLISHED" ? (
                  <>
                    {" · "}
                    <a href={`/projets/${savedSlug}`} target="_blank" rel="noopener">
                      Voir en ligne
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </Notice>
        ) : null}
      </div>

      {/* --- Identification ------------------------------------------------ */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Identification</legend>
        <div className={styles.row}>
          <TextInput
            id="p-slug"
            label="Slug (URL)"
            required
            value={v.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", e.target.value.toLowerCase());
            }}
            hint={`URL : /projets/${v.slug || "…"} — a-z, 0-9, tirets. ${slugTouched ? "" : "Déduit du titre FR."}`}
            error={err("slug")}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            autoComplete="off"
            spellCheck={false}
          />
          <TextInput
            id="p-month"
            label="Date (mois / année)"
            type="month"
            required
            value={v.month}
            onChange={(e) => update("month", e.target.value)}
            hint="Format AAAA-MM."
            error={err("month")}
          />
          <Select
            id="p-status"
            label="Statut"
            value={v.status}
            onChange={(e) => update("status", e.target.value as "DRAFT" | "PUBLISHED")}
            options={[
              { value: "DRAFT", label: "Brouillon (invisible)" },
              { value: "PUBLISHED", label: "Publié" },
            ]}
            error={err("status")}
          />
        </div>
        <div role="radiogroup" aria-labelledby="p-team-label" className={styles.checks} id="p-teamType">
          <p className={styles.groupLabel} id="p-team-label">
            Réalisation
          </p>
          {(
            [
              ["SOLO", "Solo"],
              ["TEAM", "Équipe"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input type="radio" name="teamType" value={value} checked={v.teamType === value} onChange={() => update("teamType", value)} />
              {label}
            </label>
          ))}
        </div>
        <div className={styles.checks}>
          <Checkbox id="p-ai" label="Assisté par IA" checked={v.aiAssisted} onChange={(e) => update("aiAssisted", e.target.checked)} />
          <Checkbox id="p-featured" label="Mis en avant (accueil)" checked={v.featured} onChange={(e) => update("featured", e.target.checked)} />
        </div>
      </fieldset>

      {/* --- Classement ---------------------------------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Catégories et technologies</legend>
        <div id="p-categoryIds" tabIndex={-1}>
          <p className={styles.groupLabel}>Catégories</p>
          <p className={styles.hint}>La 1re catégorie cochée (dans l&apos;ordre des catégories) détermine le style du schéma généré.</p>
          <div className={styles.checks}>
            {categories.map((c) => (
              <Checkbox key={c.id} id={`p-cat-${c.id}`} label={c.name} checked={v.categoryIds.includes(c.id)} onChange={(e) => toggle("categoryIds", c.id, e.target.checked)} />
            ))}
          </div>
          {err("categoryIds") ? <p className={styles.err}>{err("categoryIds")}</p> : null}
        </div>
        <div id="p-technologyIds" tabIndex={-1}>
          <p className={styles.groupLabel}>Technologies</p>
          <p className={styles.hint}>La 1re technologie cochée s&apos;affiche dans l&apos;en-tête de la planche.</p>
          <div className={styles.checks}>
            {techs.map((t) => (
              <Checkbox key={t.id} id={`p-tech-${t.id}`} label={t.name} checked={v.technologyIds.includes(t.id)} onChange={(e) => toggle("technologyIds", t.id, e.target.checked)} />
            ))}
          </div>
          {err("technologyIds") ? <p className={styles.err}>{err("technologyIds")}</p> : null}
        </div>
        <div className={styles.inline}>
          <TextInput
            id="p-newtech"
            label="Nouvelle technologie"
            value={newTech}
            onChange={(e) => setNewTech(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTech();
              }
            }}
            placeholder="ex. Rust"
            autoComplete="off"
          />
          <Button variant="secondary" onClick={addTech} loading={techPending} disabled={!newTech.trim()}>
            {techPending ? "Création…" : "Créer et cocher"}
          </Button>
        </div>
        {techMsg ? (
          <p role={techMsg.tone === "error" ? "alert" : "status"} className={techMsg.tone === "error" ? styles.err : styles.okText}>
            {techMsg.text}
          </p>
        ) : null}
      </fieldset>

      {/* --- Contenu FR / EN ------------------------------------------------ */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Contenu</legend>
        {enEmpty ? (
          <p className={styles.warn} role="note">
            Traduction anglaise vide : la version anglaise du site affichera le texte français. Remplissez l&apos;onglet EN avant de publier si possible.
          </p>
        ) : null}
        <div role="tablist" aria-label="Langue du contenu" className={styles.tabs}>
          {LOCALES.map((l) => {
            const hasErr = errorKeys.some((k) => k.startsWith(`${l.code}.`));
            return (
              <button
                key={l.code}
                type="button"
                role="tab"
                id={`tab-${l.code}`}
                aria-selected={tab === l.code}
                aria-controls={`panel-${l.code}`}
                tabIndex={tab === l.code ? 0 : -1}
                className={styles.tab}
                onClick={() => setTab(l.code)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    const next = l.code === "fr" ? "en" : "fr";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
              >
                {l.code.toUpperCase()} · {l.label}
                {hasErr ? <span className={styles.tabFlag}>· erreur</span> : null}
                {l.code === "en" && enEmpty ? <span className={styles.tabFlag}>· vide</span> : null}
              </button>
            );
          })}
        </div>
        {LOCALES.map((l) => (
          <div key={l.code} role="tabpanel" id={`panel-${l.code}`} aria-labelledby={`tab-${l.code}`} hidden={tab !== l.code} className={styles.tabPanel} lang={l.code}>
            {TR_FIELDS.map((f) => {
              const id = fieldIdFor(`${l.code}.${f.key}`);
              const value = v[l.code][f.key];
              const required = l.code === "fr" && (f.key === "title" || f.key === "summary");
              if (f.kind === "input") {
                return (
                  <TextInput
                    key={f.key}
                    id={id}
                    label={`${f.label} (${l.code.toUpperCase()})`}
                    required={required}
                    value={value}
                    onChange={(e) => updateTr(l.code, f.key, e.target.value)}
                    error={err(`${l.code}.${f.key}`)}
                    maxLength={160}
                  />
                );
              }
              if (f.kind === "area") {
                return (
                  <TextArea
                    key={f.key}
                    id={id}
                    label={`${f.label} (${l.code.toUpperCase()})`}
                    required={required}
                    rows={3}
                    value={value}
                    onChange={(e) => updateTr(l.code, f.key, e.target.value)}
                    error={err(`${l.code}.${f.key}`)}
                    hint="Texte brut, 600 caractères max."
                    maxLength={600}
                  />
                );
              }
              return (
                <MarkdownEditor
                  key={f.key}
                  id={id}
                  label={`${f.label} (${l.code.toUpperCase()})`}
                  value={value}
                  onChange={(nv) => updateTr(l.code, f.key, nv)}
                  error={err(`${l.code}.${f.key}`)}
                  rows={f.key === "body" ? 18 : 5}
                  withHelp={f.key === "body"}
                  lang={l.code}
                />
              );
            })}
          </div>
        ))}
      </fieldset>

      {/* --- Liens ---------------------------------------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Liens</legend>
        <div className={styles.row}>
          <TextInput id="p-githubUrl" label="GitHub" type="url" inputMode="url" placeholder="https://github.com/…" value={v.githubUrl} onChange={(e) => update("githubUrl", e.target.value)} error={err("githubUrl")} spellCheck={false} />
          <TextInput id="p-demoUrl" label="Démo" type="url" inputMode="url" placeholder="https://…" value={v.demoUrl} onChange={(e) => update("demoUrl", e.target.value)} error={err("demoUrl")} spellCheck={false} />
          <TextInput id="p-pdfUrl" label="PDF (rapport)" type="url" inputMode="url" placeholder="https://…" value={v.pdfUrl} onChange={(e) => update("pdfUrl", e.target.value)} error={err("pdfUrl")} spellCheck={false} />
        </div>
      </fieldset>

      {/* --- Visuels -------------------------------------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Visuels</legend>
        <UploadField id="p-coverImageUrl" label="Image de couverture" kind="projectImage" value={v.coverImageUrl} onChange={(url) => update("coverImageUrl", url)} error={err("coverImageUrl")} cloudinary={cloudinary} />

        <div className={styles.upload} id="p-plateSvg" tabIndex={-1}>
          <p className={styles.groupLabel}>SVG de planche</p>
          <p className={styles.hint}>
            Remplace le schéma généré. Le fichier est nettoyé côté serveur (scripts, liens externes, foreignObject… retirés) avant aperçu ET à l&apos;enregistrement. Format conseillé : viewBox 400 × 250.
          </p>
          <div className={styles.uploadTools}>
            <label className={styles.fileLabel} data-busy={svgPending || undefined}>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className={styles.fileInput}
                disabled={svgPending}
                onChange={(e) => {
                  onSvgFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span aria-hidden="true">{svgPending ? "Nettoyage…" : v.plateSvg ? "Remplacer le SVG…" : "Importer un .svg…"}</span>
              <span className="sr-only">Importer un fichier SVG de planche</span>
            </label>
            {v.plateSvg ? (
              <Button size="sm" variant="ghost" onClick={() => update("plateSvg", null)}>
                Retirer le SVG (revenir au schéma généré)
              </Button>
            ) : (
              <span className={styles.meta}>Aucun : schéma généré automatiquement.</span>
            )}
            {svgMsg ? (
              <span role={svgMsg.tone === "error" ? "alert" : "status"} className={svgMsg.tone === "error" ? styles.err : styles.okText}>
                {svgMsg.text}
              </span>
            ) : null}
          </div>
          {err("plateSvg") ? <p className={styles.err}>{err("plateSvg")}</p> : null}
          {v.plateSvg ? (
            // eslint-disable-next-line @next/next/no-img-element -- SVG assaini rendu en data: URI (aucun script exécuté)
            <img src={`data:image/svg+xml,${encodeURIComponent(v.plateSvg)}`} alt="Aperçu du SVG de planche" className={styles.svgPreview} />
          ) : null}
        </div>
      </fieldset>

      {/* --- Médias --------------------------------------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Médias ({v.media.length})</legend>
        <p className={styles.hint}>Images affichées dans l&apos;ordre de la liste. Texte alternatif FR et EN obligatoires (décrire l&apos;image pour un lecteur d&apos;écran).</p>
        {v.media.length ? (
          <ol className={styles.mediaList}>
            {v.media.map((m, i) => (
              <li key={m.key} className={styles.mediaItem}>
                <div className={styles.mediaHead}>
                  <span className={styles.groupLabel}>Média {i + 1}</span>
                  <span className={styles.uploadTools}>
                    <Button size="sm" variant="secondary" onClick={() => moveMedia(i, -1)} disabled={i === 0} aria-label={`Monter le média ${i + 1}`}>
                      ↑ Monter
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => moveMedia(i, 1)} disabled={i === v.media.length - 1} aria-label={`Descendre le média ${i + 1}`}>
                      ↓ Descendre
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        update(
                          "media",
                          v.media.filter((_, j) => j !== i),
                        );
                      }}
                      aria-label={`Retirer le média ${i + 1}`}
                    >
                      Retirer
                    </Button>
                  </span>
                </div>
                <UploadField id={fieldIdFor(`media.${i}.url`)} label="Image" kind="projectImage" value={m.url} onChange={(url) => updateMedia(i, { url })} error={err(`media.${i}.url`)} cloudinary={cloudinary} required />
                <div className={styles.row}>
                  <TextInput id={fieldIdFor(`media.${i}.altFr`)} label="Texte alternatif FR" required value={m.altFr} onChange={(e) => updateMedia(i, { altFr: e.target.value })} error={err(`media.${i}.altFr`)} lang="fr" />
                  <TextInput id={fieldIdFor(`media.${i}.altEn`)} label="Texte alternatif EN" required value={m.altEn} onChange={(e) => updateMedia(i, { altEn: e.target.value })} error={err(`media.${i}.altEn`)} lang="en" />
                </div>
                <div className={styles.row}>
                  <TextInput id={fieldIdFor(`media.${i}.captionFr`)} label="Légende FR" value={m.captionFr} onChange={(e) => updateMedia(i, { captionFr: e.target.value })} error={err(`media.${i}.captionFr`)} lang="fr" />
                  <TextInput id={fieldIdFor(`media.${i}.captionEn`)} label="Légende EN" value={m.captionEn} onChange={(e) => updateMedia(i, { captionEn: e.target.value })} error={err(`media.${i}.captionEn`)} lang="en" />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.meta}>Aucun média.</p>
        )}
        <div>
          <Button variant="secondary" onClick={() => update("media", [...v.media, { key: newKey(), url: "", altFr: "", altEn: "", captionFr: "", captionEn: "" }])}>
            + Ajouter un média
          </Button>
        </div>
      </fieldset>

      {/* --- Barre d'enregistrement ----------------------------------------- */}
      <div className={styles.saveBar}>
        <span className={styles.meta} aria-live="polite">
          {pending ? "Enregistrement…" : dirty ? "Modifications non enregistrées" : "À jour"}
          {enEmpty ? " · EN vide" : ""}
        </span>
        {v.id ? (
          <Link href={`/admin/projets/${v.id}/apercu`} className={buttonClassName({ variant: "ghost", size: "sm" })}>
            Aperçu complet
          </Link>
        ) : null}
        {v.id ? (
          <ConfirmAction action={deleteProject.bind(null, v.id)} question="Supprimer définitivement ce projet (commentaires et favoris compris) ?" redirectTo="/admin/projets?supprime=1">
            Supprimer
          </ConfirmAction>
        ) : null}
        <Button type="submit" loading={pending}>
          {pending ? "Enregistrement…" : isNew ? "Créer le projet" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
