import Link from "next/link";
import { logout } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { ThemePreference } from "@/components/theme/theme";
import { AdminNav } from "./AdminNav";
import styles from "./AdminShell.module.css";

type Props = {
  children: React.ReactNode;
  /** Administrateur connecté (requireAdmin()). */
  user: { email: string; name: string | null };
  /** Préférence de thème lue côté serveur. */
  theme: ThemePreference;
};

/**
 * Habillage de l'admin, mode « atelier » : même identité (traits, mono, jetons) mais dense,
 * sans quadrillage décoratif, navigation latérale vers les routes admin. Libellés FR (admin hors i18n).
 */
export function AdminShell({ children, user, theme }: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <Link href="/admin" className={styles.brand}>
          <span className={styles.brandName}>Atelier</span>
          <span className={styles.brandSub}>A. Grelaud · administration</span>
        </Link>
        <div className={styles.topTools}>
          <span className={styles.user} title={user.email}>
            {user.name ?? user.email}
          </span>
          <ThemeToggle
            initial={theme}
            labels={{
              legend: "Thème",
              system: "Thème : suivre le système",
              light: "Thème : calque (clair)",
              dark: "Thème : cyanotype (sombre)",
              short: { system: "Auto", light: "Calque", dark: "Cyano" },
            }}
          />
          <Link href="/" className={styles.topLink}>
            Voir le site
          </Link>
          <form action={logout}>
            <button type="submit" className={styles.topLink}>
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <div className={styles.body}>
        <aside className={styles.side}>
          <AdminNav />
        </aside>
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
