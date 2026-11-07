"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminShell.module.css";

// Routes admin de la SPEC §3 (FR uniquement, hors i18n).
const ITEMS = [
  { href: "/admin", label: "Tableau de bord", code: "A0", exact: true },
  { href: "/admin/projets", label: "Projets", code: "A1", exact: false },
  { href: "/admin/projets/nouveau", label: "Nouveau projet", code: "A1.1", exact: true },
  { href: "/admin/categories", label: "Catégories", code: "A2", exact: false },
  { href: "/admin/technologies", label: "Technologies", code: "A3", exact: false },
  { href: "/admin/commentaires", label: "Commentaires", code: "A4", exact: false },
  { href: "/admin/messages", label: "Messages", code: "A5", exact: false },
  { href: "/admin/profil", label: "Profil", code: "A6", exact: false },
] as const;

/** Navigation latérale de l'atelier : la page courante porte aria-current. */
export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) => {
    if (exact || href === "/admin") return pathname === href;
    // /admin/projets reste actif sur /admin/projets/[id] mais pas sur « nouveau ».
    if (href === "/admin/projets" && pathname === "/admin/projets/nouveau") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav aria-label="Navigation de l'administration" className={styles.nav}>
      <ul role="list">
        {ITEMS.map((item) => (
          <li key={item.href} data-sub={item.code.includes(".") ? "" : undefined}>
            <Link
              href={item.href}
              className={styles.navLink}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
            >
              <span className={styles.code} aria-hidden="true">
                {item.code}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
