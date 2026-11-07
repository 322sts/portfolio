import { buildDrawing, type SchematicStyle } from "./generators";
import { VIEW_H, VIEW_W, type Prim } from "./geometry";
import styles from "./Schematic.module.css";

export type { SchematicStyle };

type Props = {
  /** Style issu de la 1re catégorie du projet (Category.schematicStyle). */
  style: SchematicStyle;
  /** Graine du dessin : le slug du projet. `jeu-de-nim` et `calculateur-aire` ont un schéma dédié. */
  seed: string;
  /**
   * SVG personnalisé (plateSvg) DÉJÀ SANITISÉ, encodé en data URL (voir svgToDataUrl) :
   * rendu dans une <img>, jamais injecté dans le DOM.
   */
  customSvgDataUrl?: string | null;
  /** Nom accessible. Absent → schéma décoratif (aria-hidden), cas des planches titrées. */
  title?: string;
  /** Affiche les cotes en permanence (sinon : au survol / focus du parent qui pose --dim-opacity). */
  showDimensions?: boolean;
  /** Tracé trait par trait à l'apparition (défaut true ; coupé sous prefers-reduced-motion). */
  animate?: boolean;
  className?: string;
};

function renderPrim(p: Prim, key: number) {
  const cls = styles[p.k];
  switch (p.t) {
    case "path":
      return <path key={key} d={p.d} className={cls} pathLength={1} />;
    case "circle":
      return <circle key={key} cx={p.cx} cy={p.cy} r={p.r} className={cls} pathLength={1} />;
    case "rect":
      return <rect key={key} x={p.x} y={p.y} width={p.w} height={p.h} className={cls} pathLength={1} />;
    case "text":
      return (
        <text key={key} x={p.x} y={p.y} textAnchor={p.anchor ?? "middle"} className={cls}>
          {p.s}
        </text>
      );
  }
}

/**
 * Schéma de planche généré, déterministe à partir de (style, seed).
 * Server Component : aucun JavaScript envoyé, l'animation est en CSS (stroke-dashoffset).
 */
export function Schematic({
  style,
  seed,
  customSvgDataUrl,
  title,
  showDimensions = false,
  animate = true,
  className,
}: Props) {
  const rootClass = [styles.root, animate ? styles.animate : "", showDimensions ? styles.showDims : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (customSvgDataUrl) {
    return (
      <div className={`${rootClass} ${styles.custom}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL d'un SVG sanitisé, pas d'optimisation possible */}
        <img src={customSvgDataUrl} alt={title ?? ""} width={VIEW_W} height={VIEW_H} />
      </div>
    );
  }

  const drawing = buildDrawing(style, seed);
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={rootClass}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      data-style={style}
      {...a11y}
    >
      {drawing.stages.map((stage, i) => (
        <g key={i} className={styles.stage} data-stage={i}>
          {stage.map(renderPrim)}
        </g>
      ))}
      <g className={styles.dims} data-dim="">
        {drawing.dims.map(renderPrim)}
      </g>
    </svg>
  );
}
