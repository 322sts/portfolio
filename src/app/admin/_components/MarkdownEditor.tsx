"use client";

import "katex/dist/katex.min.css";
import "@/styles/prose.css";
import { useState, useTransition, type ReactNode } from "react";
import { Button, TextArea } from "@/components/form";
import { previewMarkdown } from "@/server/actions/admin/projects";
import styles from "./form.module.css";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  rows?: number;
  hint?: string;
  /** Affiche l'aide de syntaxe (corps du projet). */
  withHelp?: boolean;
  lang?: "fr" | "en";
};

/** Zone Markdown + aperçu rendu CÔTÉ SERVEUR (même pipeline sécurisé que le site public). */
export function MarkdownEditor({ id, label, value, onChange, error, rows = 14, hint, withHelp = false, lang }: Props) {
  const [preview, setPreview] = useState<ReactNode | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();

  const refresh = () =>
    start(async () => {
      setPreviewError(null);
      const r = await previewMarkdown(value);
      if (r.ok) {
        setPreview(r.data.html);
        setShown(true);
      } else {
        setPreviewError(r.error);
      }
    });

  return (
    <div className={styles.upload}>
      <TextArea
        id={id}
        label={label}
        mono
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        hint={hint ?? "Markdown : titres ##, listes, liens, formules, code, tableaux, graphiques."}
        lang={lang}
        spellCheck
      />
      <div className={styles.editorTools}>
        <Button size="sm" variant="secondary" loading={pending} onClick={refresh} aria-controls={`${id}-apercu`}>
          {pending ? "Rendu…" : shown ? "Actualiser l'aperçu" : "Aperçu"}
        </Button>
        {shown ? (
          <Button size="sm" variant="ghost" onClick={() => setShown(false)}>
            Masquer l&apos;aperçu
          </Button>
        ) : null}
        {previewError ? (
          <span role="alert" className={styles.err}>
            {previewError}
          </span>
        ) : null}
      </div>
      <div id={`${id}-apercu`} aria-live="polite">
        {shown ? (
          <div className={styles.preview} data-surface="light" lang={lang}>
            <p className={styles.meta}>APERÇU — rendu serveur</p>
            {value.trim() ? <div className="prose">{preview}</div> : <p className={styles.hint}>(vide)</p>}
          </div>
        ) : null}
      </div>
      {withHelp ? <MarkdownHelp /> : null}
    </div>
  );
}

const CHART_EXAMPLE = `\`\`\`chart
{
  "title": "Convergence de la méthode",
  "xLabel": "Itération",
  "yLabel": "Erreur",
  "series": [
    { "name": "Euler", "points": [[1, 0.5], [2, 0.25], [3, 0.125]] },
    { "name": "RK4", "points": [[1, 0.1], [2, 0.01], [3, 0.001]] }
  ]
}
\`\`\``;

/** Aide de syntaxe repliable (aucune donnée inventée : exemples neutres). */
export function MarkdownHelp() {
  return (
    <details className={styles.help}>
      <summary>Aide de syntaxe Markdown</summary>
      <h3>Formules (KaTeX)</h3>
      <p>
        En ligne : <code>{"$a^2 + b^2 = c^2$"}</code>. En bloc, sur leurs propres lignes :
      </p>
      <pre>{"$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$"}</pre>
      <h3>Code (coloration automatique)</h3>
      <pre>{"```python\ndef aire_cercle(r: float) -> float:\n    return 3.14159 * r ** 2\n```"}</pre>
      <p>Langages : python, csharp, typescript, javascript, tsx, bash, json, sql, c, cpp, java, rust, r, latex.</p>
      <h3>Tableaux</h3>
      <pre>{"| Forme | Formule |\n|---|---|\n| Cercle | πr² |\n| Triangle | bh/2 |"}</pre>
      <h3>Graphique (bloc chart, JSON)</h3>
      <p>
        Clés : <code>title</code>, <code>xLabel</code>, <code>yLabel</code>, <code>series</code> (liste de{" "}
        <code>{'{ "name", "points": [[x, y], …] }'}</code>). Deux séries maximum recommandées.
      </p>
      <pre>{CHART_EXAMPLE}</pre>
      <h3>Divers</h3>
      <p>
        Titres <code>## Section</code>, gras <code>**texte**</code>, liens <code>[texte](https://…)</code>, images{" "}
        <code>![texte alternatif](https://res.cloudinary.com/…)</code>. Le HTML brut est ignoré (sécurité).
      </p>
    </details>
  );
}
