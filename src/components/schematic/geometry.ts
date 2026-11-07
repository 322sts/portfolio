/**
 * Modèle de dessin des schémas : une liste de primitives SVG, répartie en étapes de tracé.
 * Tout est déterministe (aucun Math.random) : même seed → même dessin, côté serveur comme client.
 */

export const VIEW_W = 400;
export const VIEW_H = 250;

/** Rôle visuel d'un trait. */
export type StrokeKind =
  | "main" /* contour principal, tracé */
  | "thin" /* trait fin, tracé */
  | "construct" /* trait de construction (très léger) */
  | "dash" /* tirets (apparition en fondu) */
  | "fill"; /* petit aplat (têtes d'allumettes, nœuds pleins) */

export type TextKind = "label" | "formula" | "small" | "highlight";

export type Prim =
  | { t: "path"; d: string; k: StrokeKind }
  | { t: "circle"; cx: number; cy: number; r: number; k: StrokeKind }
  | { t: "rect"; x: number; y: number; w: number; h: number; k: StrokeKind }
  | { t: "text"; x: number; y: number; s: string; k: TextKind; anchor?: "start" | "middle" | "end" };

/** Un dessin = étapes successives (tracées l'une après l'autre) + cotes (révélées au survol). */
export type Drawing = {
  stages: Prim[][];
  dims: Prim[];
};

// ---------------------------------------------------------------------------
// Aléa déterministe
// ---------------------------------------------------------------------------

/** Hachage FNV-1a 32 bits d'une chaîne (le slug). */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Générateur mulberry32 : renvoie des flottants dans [0, 1). */
export function createRng(seed: number) {
  let a = seed || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}

export type Rng = ReturnType<typeof createRng>;

// ---------------------------------------------------------------------------
// Aides de tracé
// ---------------------------------------------------------------------------

/** Arrondi à 0,1 pour des attributs SVG courts et stables. */
export const r1 = (n: number) => Math.round(n * 10) / 10;

export const line = (x1: number, y1: number, x2: number, y2: number, k: StrokeKind = "thin"): Prim => ({
  t: "path",
  d: `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`,
  k,
});

export const polyline = (pts: ReadonlyArray<readonly [number, number]>, k: StrokeKind = "main"): Prim => ({
  t: "path",
  d: pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)} ${r1(y)}`).join(""),
  k,
});

export const text = (
  x: number,
  y: number,
  s: string,
  k: TextKind = "label",
  anchor: "start" | "middle" | "end" = "middle",
): Prim => ({ t: "text", x: r1(x), y: r1(y), s, k, anchor });

/** Pointe de flèche pleine en (x, y), orientée selon l'angle (radians) de la ligne. */
function arrowHead(x: number, y: number, angle: number, size = 6): Prim {
  const a1 = angle + Math.PI - 0.38;
  const a2 = angle + Math.PI + 0.38;
  return {
    t: "path",
    d: `M${r1(x)} ${r1(y)}L${r1(x + size * Math.cos(a1))} ${r1(y + size * Math.sin(a1))}L${r1(
      x + size * Math.cos(a2),
    )} ${r1(y + size * Math.sin(a2))}Z`,
    k: "fill",
  };
}

/** Flèche simple (liaison d'organigramme). */
export function arrow(pts: ReadonlyArray<readonly [number, number]>, k: StrokeKind = "thin"): Prim[] {
  const [x1, y1] = pts[pts.length - 2];
  const [x2, y2] = pts[pts.length - 1];
  return [polyline(pts, k), arrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1), 5)];
}

/**
 * Ligne de cote entre deux points, décalée perpendiculairement de `offset`,
 * avec lignes d'attache, flèches aux deux bouts et valeur au milieu.
 */
export function dimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offset = 12,
): Prim[] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(angle) * offset;
  const ny = Math.cos(angle) * offset;
  const ax = x1 + nx;
  const ay = y1 + ny;
  const bx = x2 + nx;
  const by = y2 + ny;
  const ext = Math.sign(offset) * 3;
  const ex = -Math.sin(angle) * ext;
  const ey = Math.cos(angle) * ext;
  const mx = (ax + bx) / 2 - Math.sin(angle) * (offset >= 0 ? 9 : -5);
  const my = (ay + by) / 2 + Math.cos(angle) * (offset >= 0 ? 9 : -5);
  return [
    line(x1, y1, ax + ex, ay + ey, "construct"),
    line(x2, y2, bx + ex, by + ey, "construct"),
    line(ax, ay, bx, by, "thin"),
    arrowHead(ax, ay, angle + Math.PI, 5),
    arrowHead(bx, by, angle, 5),
    text(mx, my + 3, label, "small"),
  ];
}

/** Croix de repère (centre, mire). */
export function cross(x: number, y: number, size = 6, k: StrokeKind = "thin"): Prim[] {
  return [line(x - size, y, x + size, y, k), line(x, y - size, x, y + size, k)];
}

/** Arc de cercle (angles en radians, sens trigonométrique écran). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, k: StrokeKind = "thin"): Prim {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  let delta = a1 - a0;
  while (delta < 0) delta += Math.PI * 2;
  const large = delta > Math.PI ? 1 : 0;
  return { t: "path", d: `M${r1(x0)} ${r1(y0)}A${r1(r)} ${r1(r)} 0 ${large} 1 ${r1(x1)} ${r1(y1)}`, k };
}
