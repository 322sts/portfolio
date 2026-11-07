"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PlotterChartProps } from "./types";
import styles from "./PlotterChart.module.css";

// Motifs de plume (identité secondaire, indépendante de la couleur).
const DASHES = ["", "7 4", "2 3", "10 3 2 3"];
const COLORS = ["var(--plot-1)", "var(--plot-2)", "var(--plot-3)", "var(--plot-4)"];
const M = { top: 14, right: 16, bottom: 30, left: 56 };

/** Graduations « rondes » (1, 2, 5 × 10^n) couvrant [min, max]. */
function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export default function PlotterChartImpl({
  series,
  title,
  unit,
  decimals = 2,
  xType = "time",
  height = 280,
  className,
}: PlotterChartProps) {
  const t = useTranslations("ui.chart");
  const locale = useLocale();
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [cursor, setCursor] = useState<number | null>(null);

  // Largeur réelle (le texte garde sa taille quel que soit l'écran).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toNum = (x: string | number) => (typeof x === "number" ? x : Date.parse(x));

  const model = useMemo(() => {
    const xs = [...new Set(series.flatMap((s) => s.points.map((p) => toNum(p.x))))].sort((a, b) => a - b);
    const ys = series.flatMap((s) => s.points.map((p) => p.y));
    const yTicks = niceTicks(Math.min(...ys), Math.max(...ys));
    const yMin = yTicks[0];
    const yMax = yTicks[yTicks.length - 1];
    const xMin = xs[0] ?? 0;
    const xMax = xs[xs.length - 1] ?? 1;
    return { xs, yTicks, yMin, yMax, xMin, xMax };
  }, [series]);

  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const sx = (x: number) => M.left + ((x - model.xMin) / (model.xMax - model.xMin || 1)) * innerW;
  const sy = (y: number) => M.top + (1 - (y - model.yMin) / (model.yMax - model.yMin || 1)) * innerH;

  const numFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const dateFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const fmtX = (x: number) => (xType === "time" ? dateFmt.format(new Date(x)) : numFmt.format(x));
  const fmtY = (y: number) => `${numFmt.format(y)}${unit ? ` ${unit}` : ""}`;

  // Graduations en x : ~1 tous les 110 px.
  const xTickCount = Math.max(2, Math.floor(innerW / 110));
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => model.xMin + ((model.xMax - model.xMin) * i) / xTickCount);
  const shortDate = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" });
  const fmtTick = (x: number) => (xType === "time" ? shortDate.format(new Date(x)) : numFmt.format(x));

  const cursorX = cursor !== null ? model.xs[cursor] : null;
  const valuesAt = (x: number) =>
    series.map((s) => {
      const p = s.points.find((pt) => toNum(pt.x) === x);
      return { s, y: p?.y ?? null };
    });

  const nearest = (px: number) => {
    let best = 0;
    let bestD = Infinity;
    model.xs.forEach((x, i) => {
      const d = Math.abs(sx(x) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const last = model.xs.length - 1;
    const cur = cursor ?? -1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(last, cur + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, cur === -1 ? last : cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    setCursor(next);
  };

  // Infobulle (dans le SVG : pas de style inline).
  const tip = (() => {
    if (cursorX === null) return null;
    const vals = valuesAt(cursorX);
    const lines = [fmtX(cursorX), ...vals.map((v) => `${v.s.label} : ${v.y === null ? "—" : fmtY(v.y)}`)];
    const w = Math.min(innerW, Math.max(...lines.map((l) => l.length)) * 6.9 + 20);
    const h = lines.length * 16 + 10;
    const cx = sx(cursorX);
    const x = cx + 12 + w > width - M.right ? cx - 12 - w : cx + 12;
    return { x, y: M.top + 6, w, h, lines, vals, cx };
  })();

  const announce = tip ? tip.lines.join(", ") : "";

  return (
    <figure className={`${styles.chart} ${className ?? ""}`}>
      <figcaption className={styles.caption}>
        <span className={styles.title}>{title}</span>
        {series.length > 1 ? (
          <ul role="list" className={styles.legend} aria-label={t("legend")}>
            {series.map((s, i) => (
              <li key={s.id}>
                <svg width="28" height="10" aria-hidden="true" focusable="false">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={COLORS[i % 4]} strokeWidth="2" strokeDasharray={DASHES[i % 4]} />
                </svg>
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
      </figcaption>

      <div
        ref={boxRef}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={title}
        aria-describedby={`${id}-aide`}
        onKeyDown={onKey}
        onBlur={() => setCursor(null)}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={styles.svg}
          aria-hidden="true"
          focusable="false"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursor(nearest(e.clientX - rect.left));
          }}
          onPointerLeave={() => setCursor(null)}
        >
          {/* Trame */}
          {model.yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={M.left} x2={width - M.right} y1={sy(v)} y2={sy(v)} className={styles.grid} />
              <text x={M.left - 8} y={sy(v) + 4} textAnchor="end" className={styles.tick}>
                {numFmt.format(v)}
              </text>
            </g>
          ))}
          {xTicks.map((x, i) => (
            <g key={`x${i}`}>
              <line x1={sx(x)} x2={sx(x)} y1={M.top} y2={M.top + innerH} className={styles.grid} />
              <line x1={sx(x)} x2={sx(x)} y1={M.top + innerH} y2={M.top + innerH + 4} className={styles.axis} />
              <text
                x={sx(x)}
                y={height - 8}
                textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
                className={styles.tick}
              >
                {fmtTick(x)}
              </text>
            </g>
          ))}
          {/* Axes */}
          <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + innerH} className={styles.axis} />
          <line x1={M.left} x2={width - M.right} y1={M.top + innerH} y2={M.top + innerH} className={styles.axis} />
          {unit ? (
            <text x={M.left - 8} y={M.top - 2} textAnchor="end" className={styles.tick}>
              {unit}
            </text>
          ) : null}

          {/* Courbes : tracé à la plume */}
          {series.map((s, i) => (
            <path
              key={s.id}
              d={s.points.map((p, j) => `${j ? "L" : "M"}${sx(toNum(p.x)).toFixed(1)} ${sy(p.y).toFixed(1)}`).join("")}
              className={styles.line}
              stroke={COLORS[i % 4]}
              strokeDasharray={DASHES[i % 4] || undefined}
              pathLength={DASHES[i % 4] ? undefined : 1}
              data-draw={DASHES[i % 4] ? undefined : ""}
            />
          ))}

          {/* Curseur + infobulle */}
          {tip ? (
            <g>
              <line x1={tip.cx} x2={tip.cx} y1={M.top} y2={M.top + innerH} className={styles.cursor} />
              {tip.vals.map((v, i) =>
                v.y === null ? null : (
                  <rect
                    key={v.s.id}
                    x={tip.cx - 3.5}
                    y={sy(v.y) - 3.5}
                    width={7}
                    height={7}
                    className={styles.marker}
                    stroke={COLORS[i % 4]}
                  />
                ),
              )}
              <rect x={tip.x} y={tip.y} width={tip.w} height={tip.h} className={styles.tipBox} />
              {tip.lines.map((l, i) => (
                <text key={i} x={tip.x + 10} y={tip.y + 18 + i * 16} className={i ? styles.tipText : styles.tipHead}>
                  {l}
                </text>
              ))}
            </g>
          ) : null}
        </svg>
      </div>
      <p id={`${id}-aide`} className={styles.hint}>
        {t("hint")}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <details className={styles.data}>
        <summary>{t("table")}</summary>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t("x")}</th>
                {series.map((s) => (
                  <th key={s.id} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.xs.map((x) => (
                <tr key={x}>
                  <th scope="row">{fmtX(x)}</th>
                  {valuesAt(x).map((v) => (
                    <td key={v.s.id}>{v.y === null ? "—" : fmtY(v.y)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
