"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import type { AppPathname } from "@/lib/i18n/routing";
import styles from "./SiteHeader.module.css";

/** Chemins statiques uniquement (les routes dynamiques exigent des params). */
export type StaticPathname = Exclude<AppPathname, `${string}[${string}]${string}`>;

export type MainNavItem = { href: StaticPathname; label: string; number: number };

type Props = {
  items: MainNavItem[];
  label: string;
  sheetLabel: string;
};

/** Navigation principale numérotée FEUILLE 01–04 ; la feuille courante porte aria-current. */
export function MainNav({ items, label, sheetLabel }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={styles.nav}>
      <ol role="list" className={styles.navList}>
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.navLink}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navNumber} aria-hidden="true">
                  {String(item.number).padStart(2, "0")}
                </span>
                <span className="sr-only">
                  {sheetLabel} {item.number} :{" "}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
