import type { Element, ElementContent, Root, RootContent } from "hast";
import { z } from "zod";
import { PlotterChart, type PlotSeries } from "@/components/plotter-chart/PlotterChart";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import styles from "./chart.module.css";

/**
 * Extension « graphique » du Markdown (agent 4).
 *
 * Un bloc de code de langage `chart` contenant du JSON :
 *   { "title": "…", "xLabel": "…", "yLabel": "…", "unit": "…",
 *     "series": [{ "name": "…", "points": [[x, y], …] }] }
 * (x = nombre ou date ISO, y = nombre) est validé par Zod puis tracé par PlotterChart.
 * JSON invalide → bloc d'erreur lisible (jamais d'exception).
 *
 * Sécurité : le plugin rehype s'exécute APRÈS rehype-sanitize ; il ne fait que déplacer le
 * TEXTE du bloc de code dans un attribut, rendu ensuite par React (échappement natif).
 * Le Markdown ne peut pas fabriquer lui-même ce marqueur (pas de HTML brut, et la
 * sanitisation retire les attributs data-*).
 */

const MAX_SOURCE = 100_000;

/** Propriété hast du marqueur (rendue en `data-chart-source`). */
export const CHART_PROP = "dataChartSource";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?)?$/, {
    message: "date ISO attendue (AAAA-MM, AAAA-MM-JJ…)",
  })
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "date ISO invalide" });

const point = z.tuple([z.union([z.number().finite(), isoDate]), z.number().finite()]);

export const chartSpecSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    xLabel: z.string().trim().max(80).optional(),
    yLabel: z.string().trim().max(80).optional(),
    unit: z.string().trim().max(16).optional(),
    decimals: z.number().int().min(0).max(6).optional(),
    series: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          points: z.array(point).min(1).max(2000),
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((spec, ctx) => {
    const kinds = new Set(spec.series.flatMap((s) => s.points.map(([x]) => typeof x)));
    if (kinds.size > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message: "toutes les abscisses doivent être du même type (nombres OU dates ISO)",
      });
    }
  });

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export type ChartParseResult = { ok: true; spec: ChartSpec } | { ok: false; error: string };

/** Analyse + validation du JSON d'un bloc `chart` (jamais d'exception). */
export function parseChartSource(source: string): ChartParseResult {
  if (source.length > MAX_SOURCE) return { ok: false, error: `bloc trop long (max ${MAX_SOURCE} caractères)` };
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch (e) {
    return { ok: false, error: `JSON invalide : ${e instanceof Error ? e.message : String(e)}` };
  }
  const parsed = chartSpecSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.length ? issue.path.join(".") : "(racine)";
    return { ok: false, error: `${path} : ${issue?.message ?? "valeur invalide"}` };
  }
  return { ok: true, spec: parsed.data };
}

// ---------------------------------------------------------------------------
// Plugin rehype : <pre><code class="language-chart">…</code></pre> → <div data-chart-source="…">
// ---------------------------------------------------------------------------

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function chartCode(node: RootContent | ElementContent): Element | null {
  if (node.type !== "element" || node.tagName !== "pre") return null;
  const code = node.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
  if (!code) return null;
  const cls = code.properties?.className;
  const classes = Array.isArray(cls) ? cls.map(String) : String(cls ?? "").split(/\s+/);
  return classes.includes("language-chart") ? code : null;
}

function walk(parent: Root | Element): void {
  parent.children.forEach((child, i) => {
    const code = chartCode(child);
    if (code) {
      const marker: Element = {
        type: "element",
        tagName: "div",
        properties: { [CHART_PROP]: code.children.map(textOf).join("") },
        children: [],
      };
      parent.children[i] = marker;
      return;
    }
    if (child.type === "element") walk(child);
  });
}

/** À placer APRÈS rehype-sanitize et AVANT Shiki (qui colorerait le bloc sinon). */
export function rehypeChartBlocks() {
  return (tree: Root) => walk(tree);
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

type Locale = "fr" | "en";

export function ChartBlock({ source, locale }: { source: string; locale: Locale }) {
  const t = (locale === "en" ? en : fr).ui.chart;
  const result = parseChartSource(source);

  if (!result.ok) {
    return (
      <div className={styles.error} role="note">
        <p className={styles.errorTitle}>{t.invalidTitle}</p>
        <p className={styles.errorText}>{result.error}</p>
        <p className={styles.errorHelp}>{t.invalidHelp}</p>
      </div>
    );
  }

  const { spec } = result;
  const xType = typeof spec.series[0]?.points[0]?.[0] === "number" ? "number" : "time";
  const series: PlotSeries[] = spec.series.map((s, i) => ({
    id: `s${i}`,
    label: s.name,
    points: s.points.map(([x, y]) => ({ x, y })),
  }));
  const axes = [
    spec.xLabel ? `${t.axisX} : ${spec.xLabel}` : null,
    spec.yLabel ? `${t.axisY} : ${spec.yLabel}${spec.unit ? ` (${spec.unit})` : ""}` : null,
  ].filter(Boolean);

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span className={styles.title}>{spec.title}</span>
        {axes.length ? <span className={styles.axes}>{axes.join(" · ")}</span> : null}
      </figcaption>
      <PlotterChart
        title={spec.title}
        series={series}
        xType={xType}
        unit={spec.unit}
        decimals={spec.decimals}
      />
    </figure>
  );
}
