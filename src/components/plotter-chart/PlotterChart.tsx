"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { PlotterChartProps } from "./types";
import styles from "./PlotterChart.module.css";

export type { PlotPoint, PlotSeries, PlotterChartProps } from "./types";

function Placeholder({ height }: { height: number }) {
  const t = useTranslations("ui.chart");
  return (
    <div className={styles.placeholder} data-height={height} role="status">
      {t("loading")}
    </div>
  );
}

// Le tracé (mesure, interactions) n'est chargé que côté client, sur les pages qui l'utilisent.
const Impl = dynamic(() => import("./PlotterChartImpl"), {
  ssr: false,
  loading: () => <Placeholder height={280} />,
});

/**
 * Graphique « table traçante » : courbes temporelles, axes, trame, curseur + infobulle
 * à la souris ET au clavier (flèches), légende, tableau de données dépliable.
 * SVG maison (~6 ko) plutôt qu'uPlot : couleurs = jetons CSS, aucun canvas.
 */
export function PlotterChart(props: PlotterChartProps) {
  return <Impl {...props} />;
}
