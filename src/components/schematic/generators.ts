import {
  arc,
  arrow,
  createRng,
  cross,
  dimension,
  hashSeed,
  line,
  polyline,
  text,
  VIEW_H,
  VIEW_W,
  type Drawing,
  type Prim,
  type Rng,
} from "./geometry";

export type SchematicStyle = "finance" | "maths" | "info" | "ia" | "generic";

const fmt = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

// ---------------------------------------------------------------------------
// Finance : courbe de prix sur axes, moyenne mobile en tirets, extrêmes cotés
// ---------------------------------------------------------------------------
function finance(rng: Rng): Drawing {
  const x0 = 44;
  const x1 = 380;
  const yTop = 28;
  const yBase = 212;
  const n = 52;

  // Marche aléatoire log-normale (déterministe).
  const values: number[] = [100];
  const drift = rng.range(-0.002, 0.006);
  for (let i = 1; i < n; i++) {
    const shock = (rng.next() + rng.next() + rng.next() - 1.5) * 0.045;
    values.push(values[i - 1] * Math.exp(drift + shock));
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const toY = (v: number) => yBase - 20 - ((v - min) / (max - min || 1)) * (yBase - yTop - 40);
  const toX = (i: number) => x0 + 8 + (i / (n - 1)) * (x1 - x0 - 16);
  const pts = values.map((v, i) => [toX(i), toY(v)] as const);

  // Moyenne mobile 8 points.
  const w = 8;
  const ma = values.map((_, i) => {
    const s = values.slice(Math.max(0, i - w + 1), i + 1);
    return [toX(i), toY(s.reduce((a, b) => a + b, 0) / s.length)] as const;
  });

  const axes: Prim[] = [
    ...arrow([
      [x0, yBase],
      [x1 + 8, yBase],
    ]),
    ...arrow([
      [x0, yBase],
      [x0, yTop - 10],
    ]),
  ];
  const ticks: Prim[] = [];
  for (let i = 1; i <= 8; i++) {
    const x = x0 + (i * (x1 - x0)) / 8;
    ticks.push(line(x, yBase, x, yBase + 4, "thin"));
    ticks.push(line(x, yTop, x, yBase, "construct"));
  }
  for (let j = 1; j <= 4; j++) {
    const y = yBase - (j * (yBase - yTop)) / 4.4;
    ticks.push(line(x0 - 4, y, x0, y, "thin"));
  }

  const iMax = values.indexOf(max);
  const iMin = values.indexOf(min);
  const [mxX, mxY] = pts[iMax];
  const [mnX, mnY] = pts[iMin];
  const last = pts[pts.length - 1];
  const change = (values[n - 1] / values[0] - 1) * 100;

  return {
    stages: [
      [...axes, ...ticks],
      [polyline(pts, "main")],
      [
        polyline(ma, "dash"),
        line(x0, mxY, x1, mxY, "dash"),
        line(x0, mnY, x1, mnY, "dash"),
        { t: "circle", cx: last[0], cy: last[1], r: 3, k: "fill" },
        text(x0 + 6, yTop - 8, "S(t)", "label", "start"),
        text(x1 + 4, yBase - 6, "t", "label", "end"),
      ],
    ],
    dims: [
      ...dimension(x1 - 14, mxY, x1 - 14, mnY, `Δ ${fmt(((max - min) / min) * 100)} %`, -10),
      { t: "circle", cx: mxX, cy: mxY, r: 4.5, k: "thin" },
      { t: "circle", cx: mnX, cy: mnY, r: 4.5, k: "thin" },
      text(mxX, mxY - 9, "max", "small"),
      text(mnX, mnY + 15, "min", "small"),
      text(last[0] - 6, last[1] - 9, `${change >= 0 ? "+" : ""}${fmt(change)} %`, "small", "end"),
    ],
  };
}

// ---------------------------------------------------------------------------
// Maths : cercle circonscrit, triangle inscrit, hauteur, angle et rayon cotés
// ---------------------------------------------------------------------------
function maths(rng: Rng): Drawing {
  const cx = rng.range(150, 190);
  const cy = 128;
  const R = rng.range(72, 88);
  const a0 = rng.range(-2.4, -1.9);
  const a1 = a0 + rng.range(1.9, 2.4);
  const a2 = a1 + rng.range(1.8, 2.3);
  const P = [a0, a1, a2].map((a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const);
  const [A, B, C] = P;

  // Pied de la hauteur issue de A sur (BC).
  const bx = C[0] - B[0];
  const by = C[1] - B[1];
  const tt = ((A[0] - B[0]) * bx + (A[1] - B[1]) * by) / (bx * bx + by * by);
  const H = [B[0] + tt * bx, B[1] + tt * by] as const;

  // Angle en A.
  const angAB = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const angAC = Math.atan2(C[1] - A[1], C[0] - A[0]);
  let alpha = Math.abs(angAC - angAB);
  if (alpha > Math.PI) alpha = Math.PI * 2 - alpha;
  const [s0, s1] = angAB < angAC ? [angAB, angAC] : [angAC, angAB];
  const arcFrom = s1 - s0 > Math.PI ? s1 : s0;
  const arcTo = s1 - s0 > Math.PI ? s0 + Math.PI * 2 : s1;

  const label = (p: readonly [number, number], s: string) => {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const d = Math.hypot(dx, dy) || 1;
    return text(p[0] + (dx / d) * 14, p[1] + (dy / d) * 14 + 4, s, "label");
  };

  const side = Math.hypot(C[0] - B[0], C[1] - B[1]);

  return {
    stages: [
      [line(cx - R - 24, cy, cx + R + 24, cy, "construct"), line(cx, cy - R - 16, cx, cy + R + 16, "construct")],
      [{ t: "circle", cx, cy, r: R, k: "main" }],
      [polyline([A, B, C, A], "main"), ...cross(cx, cy, 5)],
      [
        line(A[0], A[1], H[0], H[1], "dash"),
        line(cx, cy, B[0], B[1], "thin"),
        arc(A[0], A[1], 16, arcFrom, arcTo, "thin"),
        label(A, "A"),
        label(B, "B"),
        label(C, "C"),
        text(cx + 8, cy - 6, "O", "small", "start"),
        text(388, 40, "a² = b² + c² − 2bc·cos α", "formula", "end"),
      ],
    ],
    dims: [
      ...dimension(cx, cy, B[0], B[1], `r = ${fmt(R / 10)}`, 10),
      ...dimension(B[0], B[1], C[0], C[1], `a = ${fmt(side / 10)}`, 14),
      text(A[0] + 26 * Math.cos((arcFrom + arcTo) / 2), A[1] + 26 * Math.sin((arcFrom + arcTo) / 2) + 4, `α = ${Math.round((alpha * 180) / Math.PI)}°`, "small"),
      { t: "path", d: `M${H[0] - 4} ${H[1]}h4v-4`, k: "thin" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Info : organigramme de blocs reliés (repères neutres A1, B1…)
// ---------------------------------------------------------------------------
function info(rng: Rng): Drawing {
  const cols = 3;
  const counts = [rng.int(1, 2), rng.int(2, 3), rng.int(1, 2)];
  const bw = 78;
  const bh = 32;
  const gapX = (VIEW_W - 40 - cols * bw) / (cols - 1);
  const letters = ["A", "B", "C"];

  const blocks = counts.map((count, c) => {
    const x = 20 + c * (bw + gapX);
    const total = count * bh + (count - 1) * 26;
    const top = (VIEW_H - 40 - total) / 2 + 8;
    return Array.from({ length: count }, (_, i) => ({ x, y: top + i * (bh + 26), id: `${letters[c]}${i + 1}` }));
  });

  const rects: Prim[] = [];
  const labels: Prim[] = [];
  blocks.flat().forEach((b) => {
    rects.push({ t: "rect", x: b.x, y: b.y, w: bw, h: bh, k: "main" });
    rects.push(line(b.x, b.y + 10, b.x + bw, b.y + 10, "thin"));
    labels.push(text(b.x + 5, b.y + 8, b.id, "small", "start"));
    labels.push(line(b.x + 14, b.y + 22, b.x + bw - 14 - rng.int(0, 22), b.y + 22, "construct"));
  });

  const links: Prim[] = [];
  for (let c = 0; c < cols - 1; c++) {
    blocks[c].forEach((from) => {
      blocks[c + 1].forEach((to) => {
        const xa = from.x + bw;
        const ya = from.y + bh / 2 + 4;
        const xb = to.x;
        const yb = to.y + bh / 2 + 4;
        const mid = xa + gapX / 2;
        links.push(
          ...arrow([
            [xa, ya],
            [mid, ya],
            [mid, yb],
            [xb - 1, yb],
          ]),
        );
      });
    });
  }

  // Boucle de retour en tirets sous le schéma.
  const first = blocks[0][blocks[0].length - 1];
  const lastCol = blocks[cols - 1];
  const last = lastCol[lastCol.length - 1];
  const yLoop = VIEW_H - 22;
  const loop: Prim[] = [
    polyline(
      [
        [last.x + bw / 2, last.y + bh],
        [last.x + bw / 2, yLoop],
        [first.x + bw / 2, yLoop],
        [first.x + bw / 2, first.y + bh + 6],
      ],
      "dash",
    ),
  ];

  const b0 = blocks[0][0];
  const b1 = blocks[1][0];
  return {
    stages: [rects, links, [...labels, ...loop]],
    dims: [
      ...dimension(b0.x, b0.y, b0.x + bw, b0.y, `${bw}`, -12),
      ...dimension(b0.x + bw, b1.y + bh + 4, b1.x, b1.y + bh + 4, fmt(gapX, 0), 10),
      text(VIEW_W - 22, VIEW_H - 26, `n = ${counts.reduce((a, b) => a + b, 0)}`, "small", "end"),
    ],
  };
}

// ---------------------------------------------------------------------------
// IA : réseau de neurones en couches
// ---------------------------------------------------------------------------
function ia(rng: Rng): Drawing {
  const layers = [rng.int(3, 4), rng.int(4, 6), rng.int(4, 6), rng.int(1, 3)];
  const x0 = 50;
  const x1 = 350;
  const nodes = layers.map((count, l) => {
    const x = x0 + (l * (x1 - x0)) / (layers.length - 1);
    const span = (count - 1) * 34;
    return Array.from({ length: count }, (_, i) => ({ x, y: 118 - span / 2 + i * 34 }));
  });

  const edges: Prim[] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    nodes[l].forEach((a) => nodes[l + 1].forEach((b) => edges.push(line(a.x + 7, a.y, b.x - 7, b.y, "construct"))));
  }
  // Un chemin d'activation mis en évidence.
  const path = nodes.map((layer) => layer[Math.floor(rng.next() * layer.length)]);
  const highlight: Prim[] = [];
  for (let l = 0; l < path.length - 1; l++) {
    highlight.push(line(path[l].x + 7, path[l].y, path[l + 1].x - 7, path[l + 1].y, "main"));
  }

  const circles: Prim[] = nodes.flat().map((n) => ({ t: "circle", cx: n.x, cy: n.y, r: 7, k: "main" }) as const);
  const active: Prim[] = path.map((n) => ({ t: "circle", cx: n.x, cy: n.y, r: 3, k: "fill" }) as const);

  const io: Prim[] = [
    ...nodes[0].map((n, i) => text(n.x - 14, n.y + 4, `x${i + 1}`, "small", "end")),
    ...nodes[layers.length - 1].map((n, i) => text(n.x + 14, n.y + 4, layers[3] > 1 ? `ŷ${i + 1}` : "ŷ", "small", "start")),
  ];

  return {
    stages: [circles, edges, [...highlight, ...active, ...io]],
    dims: layers.flatMap((count, l) => {
      const x = nodes[l][0].x;
      return [text(x, 236, `n=${count}`, "small"), line(x, 222, x, 226, "thin")];
    }),
  };
}

// ---------------------------------------------------------------------------
// Générique : trame, mire et croix de repère
// ---------------------------------------------------------------------------
function generic(rng: Rng): Drawing {
  const grid: Prim[] = [];
  for (let x = 40; x <= 360; x += 40) grid.push(line(x, 30, x, 220, "construct"));
  for (let y = 30; y <= 220; y += 38) grid.push(line(40, y, 360, y, "construct"));
  const cx = rng.range(160, 240);
  const cy = rng.range(100, 150);
  const r = rng.range(30, 46);
  return {
    stages: [
      grid,
      [
        { t: "rect", x: 40, y: 30, w: 320, h: 190, k: "main" },
        { t: "circle", cx, cy, r, k: "main" },
        { t: "circle", cx, cy, r: r * 0.45, k: "thin" },
      ],
      [...cross(cx, cy, r + 12, "thin"), line(40, 30, 360, 220, "dash"), line(360, 30, 40, 220, "dash"), ...cross(40, 30, 8), ...cross(360, 30, 8), ...cross(40, 220, 8), ...cross(360, 220, 8)],
    ],
    dims: [...dimension(40, 220, 360, 220, "320", 14), ...dimension(360, 30, 360, 220, "190", -16), text(cx + r + 6, cy - r, `⌀ ${fmt((r * 2) / 10)}`, "small", "start")],
  };
}

// ---------------------------------------------------------------------------
// Schémas spécifiques
// ---------------------------------------------------------------------------

/** Jeu de Nim : tas de 3, 4 et 5 allumettes ; somme de Nim 3 ⊕ 4 ⊕ 5 = 2 (fait mathématique). */
function nim(): Drawing {
  const heaps = [3, 4, 5];
  const centers = [64, 138, 222];
  const base = 150;
  const sticks: Prim[] = [];
  const heads: Prim[] = [];
  heaps.forEach((count, h) => {
    const spacing = 11;
    const start = centers[h] - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const x = start + i * spacing;
      sticks.push(line(x, base, x, base - 62, "main"));
      heads.push({ t: "circle", cx: x, cy: base - 64, r: 3.2, k: "fill" });
    }
  });

  const bin = (n: number) => n.toString(2).padStart(3, "0");
  const xorCol = 330;
  const rows = heaps.map((n, i) => text(xorCol + 30, 70 + i * 20, bin(n), "label", "end"));
  const ops = [1, 2].map((i) => text(xorCol - 22, 70 + i * 20, "⊕", "label", "end"));
  const result = heaps.reduce((a, b) => a ^ b, 0);

  return {
    stages: [
      [line(28, base, 262, base, "thin"), ...centers.map((c) => line(c, base, c, base + 6, "thin"))],
      sticks,
      [
        ...heads,
        ...heaps.map((n, i) => text(centers[i], base + 22, `n${["₁", "₂", "₃"][i]} = ${n}`, "label")),
        ...heaps.map((n, i) => text(centers[i], base + 40, bin(n), "small")),
      ],
      [
        ...rows,
        ...ops,
        line(xorCol - 30, 120, xorCol + 34, 120, "thin"),
        text(xorCol + 30, 138, bin(result), "highlight", "end"),
        text(200, 228, `3 ⊕ 4 ⊕ 5 = ${result}`, "formula"),
      ],
    ],
    dims: heaps.flatMap((count, h) => {
      const spacing = 11;
      const start = centers[h] - ((count - 1) * spacing) / 2;
      return dimension(start, base - 70, start + (count - 1) * spacing, base - 70, String(count), -10);
    }).concat([text(xorCol + 30, 156, "≠ 0", "small", "end")]),
  };
}

/** Calculateur d'aire : cercle (πr²), triangle (bh/2), rectangle (l × L), cotés. */
function areaCalculator(): Drawing {
  const circle = { cx: 74, cy: 112, r: 44 };
  const tri = { ax: 150, ay: 156, bx: 246, by: 156, cx: 196, cy: 68 };
  const rect = { x: 278, y: 84, w: 100, h: 64 };
  return {
    stages: [
      [line(16, 156, 388, 156, "construct")],
      [
        { t: "circle", cx: circle.cx, cy: circle.cy, r: circle.r, k: "main" },
        polyline(
          [
            [tri.ax, tri.ay],
            [tri.bx, tri.by],
            [tri.cx, tri.cy],
            [tri.ax, tri.ay],
          ],
          "main",
        ),
        { t: "rect", x: rect.x, y: rect.y, w: rect.w, h: rect.h, k: "main" },
      ],
      [
        ...cross(circle.cx, circle.cy, 4),
        line(circle.cx, circle.cy, circle.cx + circle.r * Math.cos(-0.6), circle.cy + circle.r * Math.sin(-0.6), "thin"),
        line(tri.cx, tri.cy, tri.cx, tri.ay, "dash"),
        { t: "path", d: `M${tri.cx} ${tri.ay - 6}h6v6`, k: "thin" },
      ],
      [
        text(circle.cx, 196, "πr²", "formula"),
        text((tri.ax + tri.bx) / 2, 196, "bh/2", "formula"),
        text(rect.x + rect.w / 2, 196, "l × L", "formula"),
        text(circle.cx, 222, "A = π · r · r", "small"),
        text((tri.ax + tri.bx) / 2, 222, "A = b · h / 2", "small"),
        text(rect.x + rect.w / 2, 222, "A = l · L", "small"),
      ],
    ],
    dims: [
      text(circle.cx + 22, circle.cy - 20, "r", "highlight"),
      ...dimension(tri.ax, tri.ay, tri.bx, tri.by, "b", 12),
      ...dimension(tri.cx, tri.cy, tri.cx, tri.ay, "h", -12).slice(2),
      ...dimension(rect.x, rect.y, rect.x + rect.w, rect.y, "L", -12),
      ...dimension(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, "l", -10),
    ],
  };
}

const SPECIFIC: Record<string, () => Drawing> = {
  "jeu-de-nim": nim,
  "calculateur-aire": areaCalculator,
};

const BY_STYLE: Record<SchematicStyle, (rng: Rng) => Drawing> = { finance, maths, info, ia, generic };

/** Dessin déterministe d'une planche : schéma spécifique au slug s'il existe, sinon par style. */
export function buildDrawing(style: SchematicStyle, seed: string): Drawing {
  const specific = SPECIFIC[seed];
  if (specific) return specific();
  return BY_STYLE[style](createRng(hashSeed(`${style}:${seed}`)));
}
