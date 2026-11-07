import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PaletteButton } from "@/components/command-palette/PaletteButton";
import { logout } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { ThemePreference } from "@/components/theme/theme";
import { HeaderShell } from "./HeaderShell";
import { LocaleSwitch } from "./LocaleSwitch";
import { MainNav } from "./MainNav";
import { MAIN_SHEETS } from "./nav-items";
import styles from "./SiteHeader.module.css";

type Props = {
  /** Préférence de thème lue côté serveur (cookie). */
  theme: ThemePreference;
  /** Utilisateur connecté (lien « Mon compte ») ou null (lien « Connexion »). */
  user: { name: string | null } | null;
};

/** En-tête public : nom, feuilles 01–04, langue, thème, compte, palette. Menu repliable sur mobile. */
export async function SiteHeader({ theme, user }: Props) {
  const t = await getTranslations("nav");
  const tu = await getTranslations("ui");

  const brand = (
    <Link href="/" className={styles.brand}>
      <span className={styles.brandName}>A. Grelaud</span>
      <span className={styles.brandSub}>IMT Nord Europe</span>
    </Link>
  );

  const items = MAIN_SHEETS.map((s) => ({ href: s.href, number: s.number, label: t(s.key) }));

  const localeSwitchProps = {
    label: t("language"),
    currentLabel: t("currentLocale"),
    switchLabel: t("switchLocaleLabel"),
  };

  return (
    <HeaderShell
      brand={brand}
      labels={{ menu: t("menu"), open: t("menuOpen"), close: t("menuClose") }}
      aside={
        <PaletteButton
          label={tu("palette.open")}
          ariaLabel={tu("palette.openLabel")}
          shortcut={tu("palette.shortcut")}
        />
      }
    >
      <MainNav items={items} label={t("label")} sheetLabel={t("sheet")} />
      <div className={styles.tools}>
        <Suspense fallback={<span className={styles.locale} aria-hidden="true" />}>
          <LocaleSwitch {...localeSwitchProps} />
        </Suspense>
        <ThemeToggle
          initial={theme}
          labels={{
            legend: tu("theme.legend"),
            system: tu("theme.system"),
            light: tu("theme.light"),
            dark: tu("theme.dark"),
            short: {
              system: tu("theme.shortSystem"),
              light: tu("theme.shortLight"),
              dark: tu("theme.shortDark"),
            },
          }}
        />
        {user ? (
          <>
            <Link href="/compte" className={styles.account}>
              {t("account")}
            </Link>
            <form action={logout} className={styles.logoutForm}>
              <button type="submit" className={styles.account}>
                {t("logout")}
              </button>
            </form>
          </>
        ) : (
          <Link href="/connexion" className={styles.account}>
            {t("login")}
          </Link>
        )}
      </div>
    </HeaderShell>
  );
}
