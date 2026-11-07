import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n/routing";
import { renderMarkdown } from "@/lib/markdown";
import { getFilterOptions, getPublishedProjects } from "@/lib/queries/projects";
import { parseProjectFilters } from "@/lib/validation/project-filters";
import { Badge } from "@/components/badge/Badge";
import { CrossRef } from "@/components/cross-ref/CrossRef";
import { Dimension } from "@/components/dimension/Dimension";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { FilterBar } from "@/components/filter-bar/FilterBar";
import { Figure } from "@/components/figure/Figure";
import { Button, Checkbox, Select, TextArea, TextInput } from "@/components/form";
import { MarginNote } from "@/components/margin-note/MarginNote";
import { Nomenclature } from "@/components/nomenclature/Nomenclature";
import { Notice } from "@/components/notice/Notice";
import { Plate } from "@/components/plate/Plate";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { PlotterChart } from "@/components/plotter-chart/PlotterChart";
import { Prose } from "@/components/prose/Prose";
import { Schematic, type SchematicStyle } from "@/components/schematic/Schematic";
import { Sheet } from "@/components/sheet/Sheet";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { ViewSwitch } from "@/components/view-switch/ViewSwitch";
import styles from "./design.module.css";

// Planche des composants (agent 3) : outil de développement, introuvable en production.

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }> };

const STYLES: SchematicStyle[] = ["finance", "maths", "info", "ia", "generic"];
const COLORS = [
  "--bg",
  "--grid",
  "--grid-major",
  "--ink",
  "--muted",
  "--mark",
  "--mark-ink",
  "--danger",
  "--ok",
  "--surface",
  "--surface-2",
  "--rule",
];

// Échantillon Markdown passé par le vrai pipeline sécurisé (agent 2).
const SAMPLE_MD = `## Théorème de Bouton

Une position du jeu de Nim est **perdante** pour le joueur qui doit jouer si et seulement si la somme de Nim des tas est nulle :

$$
n_1 \\oplus n_2 \\oplus \\cdots \\oplus n_k = 0
$$

Exemple : avec des tas de 3, 4 et 5 allumettes, $3 \\oplus 4 \\oplus 5 = 2 \\neq 0$.

| Tas | Décimal | Binaire |
|---|---:|---:|
| 1 | 3 | 011 |
| 2 | 4 | 100 |
| 3 | 5 | 101 |

- liste à puces en tirets de cote
- deuxième élément

\`\`\`python
def nim_sum(heaps: list[int]) -> int:
    total = 0
    for h in heaps:
        total ^= h
    return total
\`\`\`
`;

/** Série synthétique déterministe pour la démonstration du PlotterChart (pas une donnée réelle). */
function demoSeries(seed: number, start: number) {
  let v = start;
  let a = seed;
  return Array.from({ length: 36 }, (_, i) => {
    a = (a * 1103515245 + 12345) % 2147483648;
    v = v * (1 + ((a / 2147483648 - 0.48) * 0.06));
    const d = new Date(Date.UTC(2024, i, 1));
    return { x: d.toISOString().slice(0, 10), y: Math.round(v * 100) / 100 };
  });
}

export default async function DesignPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale: raw } = await params;
  const locale = raw as AppLocale;
  setRequestLocale(locale);

  const [projects, options, md] = await Promise.all([
    getPublishedProjects(locale),
    getFilterOptions(locale),
    renderMarkdown(SAMPLE_MD),
  ]);
  const filters = parseProjectFilters({});
  const sample = projects[0];

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.intro}>
        <p className="mono-caps">Feuille 00 · usage interne</p>
        <h1 className={styles.hero}>Design system</h1>
        <Dimension value="Plan d'ingénieur · calque · cyanotype" />
        <p className={styles.lede}>
          Tous les composants du site, alimentés par les projets réellement publiés en base ({projects.length}). Le
          thème courant se change dans l&apos;en-tête ou avec la palette (Ctrl K).
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-jetons">
        <h2 id="s-jetons">01 · Jetons</h2>
        <div className={styles.compare}>
          {(["light", "dark"] as const).map((surface) => (
            <div key={surface} data-surface={surface} className={styles.surface}>
              <p className="mono-caps">{surface === "light" ? "Calque (clair)" : "Cyanotype (sombre)"}</p>
              <ul role="list" className={styles.swatches}>
                {COLORS.map((c) => (
                  <li key={c}>
                    <span className={styles.swatch} data-token={c} aria-hidden="true" />
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
              <div className={styles.row}>
                <Button>Primaire</Button>
                <Button variant="secondary">Secondaire</Button>
                <Button variant="danger">Supprimer</Button>
              </div>
              <div className={styles.row}>
                <Badge>Python</Badge>
                <Badge tone="mark">Assisté par IA</Badge>
                <Badge tone="ok">Publié</Badge>
                <Badge tone="danger">Rejeté</Badge>
              </div>
              <p>
                Texte courant avec <a href="#s-jetons">un lien</a>, du <mark>surlignage</mark> et une{" "}
                <code>valeur</code>.
              </p>
              {sample ? <Plate project={sample} /> : null}
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-typo">
        <h2 id="s-typo">02 · Typographie</h2>
        <div className={styles.typo}>
          <p className={styles.hero}>Hero 104</p>
          <h1>Titre 40 étiré</h1>
          <h2>Titre 28</h2>
          <h3>Titre 22</h3>
          <h4>Titre 18</h4>
          <p>
            Texte courant 16 / 1,6 — Archivo étroite (wdth 84). Les métadonnées, cotes et cartouches sont en JetBrains
            Mono.
          </p>
          <p className="mono-caps">Mono 12 capitales · PL. 01 · Rév. 2026-11-07</p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-schemas">
        <h2 id="s-schemas">03 · Schémas générés</h2>
        <p className={styles.note}>Déterministes (style + slug). Survol : cotes en --mark.</p>
        <div className={styles.schematics}>
          {STYLES.map((s) => (
            <figure key={s} className={styles.schematicCard}>
              <Schematic style={s} seed="demo-planche" />
              <figcaption className="mono-caps">{s}</figcaption>
            </figure>
          ))}
          <figure className={styles.schematicCard}>
            <Schematic style="info" seed="jeu-de-nim" showDimensions />
            <figcaption className="mono-caps">jeu-de-nim (cotes visibles)</figcaption>
          </figure>
          <figure className={styles.schematicCard}>
            <Schematic style="info" seed="calculateur-aire" showDimensions />
            <figcaption className="mono-caps">calculateur-aire (cotes visibles)</figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-planches">
        <h2 id="s-planches">04 · Planches et nomenclature</h2>
        <div className={styles.toolbar}>
          <ViewSwitch filters={filters} />
        </div>
        <FilterBar options={options} filters={filters} resultCount={projects.length} />
        <div className={styles.spaced}>
          {projects.length ? (
            <PlateGrid projects={projects} />
          ) : (
            <EmptyState title="Aucun projet publié." />
          )}
        </div>
        <div className={styles.spaced}>
          <Nomenclature projects={projects} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-lecture">
        <h2 id="s-lecture">05 · Feuille de lecture</h2>
        <Sheet withMargin stamp="Calque · démonstration">
          <MarginNote label="N. 1" id="note-1">
            Annotation de marge : à droite sur grand écran, dans le flux sur mobile.
          </MarginNote>
          <p className={styles.sheetLede}>
            Renvois : voir <CrossRef target="fig-1">fig. 1</CrossRef> et la <CrossRef target="note-1">note 1</CrossRef>{" "}
            — la cible est surlignée brièvement.
          </p>
          <Prose>{md}</Prose>
          <Figure id="fig-1" number={1} caption="Tas de 3, 4 et 5 allumettes ; somme de Nim 3 ⊕ 4 ⊕ 5 = 2.">
            <Schematic style="info" seed="jeu-de-nim" title="Schéma du jeu de Nim" showDimensions animate={false} />
          </Figure>
        </Sheet>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-graph">
        <h2 id="s-graph">06 · Table traçante</h2>
        <p className={styles.note}>Données synthétiques de démonstration (aucune donnée réelle).</p>
        <PlotterChart
          title="Séries synthétiques"
          unit="€"
          series={[
            { id: "a", label: "Série A", points: demoSeries(7, 100) },
            { id: "b", label: "Série B", points: demoSeries(42, 96) },
          ]}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className={styles.section} aria-labelledby="s-form">
        <h2 id="s-form">07 · Formulaires et retours</h2>
        <form className={styles.form} action="#">
          <TextInput id="d-nom" name="nom" label="Nom" required autoComplete="name" />
          <TextInput
            id="d-email"
            name="email"
            type="email"
            label="Email"
            required
            error="Adresse email invalide."
            defaultValue="pas-un-email"
          />
          <Select
            id="d-sujet"
            name="sujet"
            label="Sujet"
            placeholder="Choisir…"
            options={[
              { value: "stage", label: "Stage" },
              { value: "projet", label: "Projet" },
            ]}
          />
          <TextArea id="d-msg" name="message" label="Message" hint="2000 caractères maximum." />
          <Checkbox id="d-ok" name="ok" label="J'accepte d'être recontacté" />
          <div className={styles.row}>
            <Button type="button">Envoyer</Button>
            <Button type="button" variant="secondary" loading>
              Envoi…
            </Button>
          </div>
        </form>
        <div className={styles.stack}>
          <Notice tone="success" title="Envoyé">
            Message enregistré.
          </Notice>
          <Notice tone="error" title="Erreur">
            Une erreur est survenue. Réessayez.
          </Notice>
          <EmptyState title="Rien à afficher pour le moment." action={<Button variant="secondary">Action</Button>}>
            État vide cadré, sans illustration générique.
          </EmptyState>
        </div>
      </section>

      <TitleBlock title="Design system" sheet={{ number: 0, total: 4 }} revision={new Date()} />
    </main>
  );
}
