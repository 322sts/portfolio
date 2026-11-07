"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Icon } from "@/components/icons/Icon";
import styles from "./Nomenclature.module.css";

export type NomenclatureRow = {
  slug: string;
  plateNumber: number;
  title: string;
  category: string;
  stack: string[];
  team: "solo" | "team";
  /** AAAA-MM */
  date: string;
  ai: boolean;
};

type Column = "plateNumber" | "title" | "category" | "stack" | "team" | "date" | "ai";
type Direction = "ascending" | "descending";

const COLUMNS: { key: Column; label: "plate" | "project" | "category" | "stack" | "team" | "date" | "ai" }[] = [
  { key: "plateNumber", label: "plate" },
  { key: "title", label: "project" },
  { key: "category", label: "category" },
  { key: "stack", label: "stack" },
  { key: "team", label: "team" },
  { key: "date", label: "date" },
  { key: "ai", label: "ai" },
];

type Props = { rows: NomenclatureRow[]; className?: string };

/**
 * Tableau de nomenclature : tri par en-tête (aria-sort), flèches haut/bas pour passer
 * d'une ligne à l'autre (focus sur le lien du projet), Début/Fin pour les extrémités.
 */
export function NomenclatureTable({ rows, className }: Props) {
  const t = useTranslations("ui.nomenclature");
  const tp = useTranslations("ui.plate");
  const locale = useLocale();
  const hintId = useId();
  const [sort, setSort] = useState<{ key: Column; dir: Direction }>({ key: "plateNumber", dir: "ascending" });
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const sorted = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
    const value = (r: NomenclatureRow): string | number => {
      switch (sort.key) {
        case "plateNumber":
          return r.plateNumber;
        case "stack":
          return r.stack.join(", ");
        case "ai":
          return r.ai ? 1 : 0;
        default:
          return r[sort.key];
      }
    };
    const out = [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : collator.compare(String(va), String(vb));
      return cmp || a.plateNumber - b.plateNumber;
    });
    return sort.dir === "ascending" ? out : out.reverse();
  }, [rows, sort, locale]);

  const toggle = (key: Column) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "ascending" ? "descending" : "ascending" }));

  // Navigation clavier entre les lignes (sur les liens de titre).
  const onKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const links = Array.from(bodyRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-row-link]") ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    let next = index;
    if (e.key === "ArrowDown") next = Math.min(links.length - 1, index + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = links.length - 1;
    else return;
    e.preventDefault();
    links[next]?.focus();
  };

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <p id={hintId} className={styles.hint}>
        {t("hint")}
      </p>
      {/* Région défilante focusable : défilement horizontal au clavier sur mobile. */}
      <div className={styles.scroller} role="region" aria-label={t("caption")} tabIndex={0}>
        <table className={styles.table} aria-describedby={hintId}>
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? sort.dir : "none"}
                    className={styles[`col-${col.key}`]}
                  >
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => toggle(col.key)}
                      aria-label={t("sortBy", { column: t(col.label) })}
                    >
                      <span>{t(col.label)}</span>
                      <Icon
                        name={active ? (sort.dir === "ascending" ? "sortAsc" : "sortDesc") : "sort"}
                        size={12}
                        className={active ? styles.sortActive : styles.sortIdle}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={bodyRef} onKeyDown={onKeyDown}>
            {sorted.map((r) => (
              <tr key={r.slug}>
                <td className={styles.num}>{String(r.plateNumber).padStart(2, "0")}</td>
                <th scope="row" className={styles.title}>
                  <Link
                    href={{ pathname: "/projets/[slug]", params: { slug: r.slug } }}
                    data-row-link=""
                    className={styles.rowLink}
                  >
                    {r.title}
                  </Link>
                </th>
                <td>{r.category || "—"}</td>
                <td className={styles.stack}>{r.stack.join(" · ") || "—"}</td>
                <td className={styles.mono}>{r.team === "team" ? tp("team") : tp("solo")}</td>
                <td className={styles.mono}>
                  <time dateTime={r.date}>{r.date.replace("-", ".")}</time>
                </td>
                <td className={styles.mono}>
                  {r.ai ? <span className={styles.ai}>{t("yes")}</span> : <span className={styles.no}>{t("no")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
