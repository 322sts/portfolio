// Icônes au trait (SPEC §6 : petits tracés SVG, pas d'emoji). Décoratives par défaut.

const PATHS = {
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M5 5l14 14M19 5L5 19",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L21 21",
  arrowRight: "M4 12h15M14 7l5 5-5 5",
  arrowLeft: "M20 12H5M10 7l-5 5 5 5",
  arrowUpRight: "M7 17L17 7M9 7h8v8",
  check: "M4 12.5l5 5L20 6.5",
  alert: "M12 3l9.5 17h-19L12 3zM12 10v4.5M12 17.2v.6",
  sort: "M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4",
  sortAsc: "M12 20V4M6 10l6-6 6 6",
  sortDesc: "M12 4v16M6 14l6 6 6-6",
  plus: "M12 4v16M4 12h16",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  grid: "M4 4h16v16H4zM4 12h16M12 4v16",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
  dot: "M12 11v2",
  crosshair: "M12 2v6M12 16v6M2 12h6M16 12h6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
} as const;

export type IconName = keyof typeof PATHS;

type Props = {
  name: IconName;
  /** Taille en px (défaut 16). */
  size?: number;
  /** Si fourni, l'icône devient porteuse de sens (role="img"). */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 16, label, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
