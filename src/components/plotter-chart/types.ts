/** Point d'une série : x = date ISO (AAAA-MM-JJ…) en mode temps, ou nombre. */
export type PlotPoint = { x: string | number; y: number };

export type PlotSeries = {
  id: string;
  label: string;
  points: PlotPoint[];
};

export type PlotterChartProps = {
  /** 1 à 4 séries (identité : couleur + motif de trait, jamais la couleur seule). */
  series: PlotSeries[];
  /** Titre / nom accessible du graphique. */
  title: string;
  /** Unité des ordonnées (ex. « € », « % »). */
  unit?: string;
  /** Décimales affichées (défaut 2). */
  decimals?: number;
  /** « time » si x est une date ISO (défaut), « number » sinon. */
  xType?: "time" | "number";
  /** Hauteur en px (défaut 280). */
  height?: 220 | 280 | 360;
  className?: string;
};
