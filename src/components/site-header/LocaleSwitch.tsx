"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { routing, type AppLocale } from "@/lib/i18n/routing";
import styles from "./SiteHeader.module.css";

type Props = {
  label: string;
  currentLabel: string;
  switchLabel: string;
  className?: string;
};

type LinkHref = React.ComponentProps<typeof Link>["href"];

/**
 * FR / EN : renvoie vers la MÊME page dans l'autre langue (chemins traduits, paramètres
 * dynamiques et query string conservés). Un vrai lien : fonctionne sans JavaScript.
 */
export function LocaleSwitch({ label, currentLabel, switchLabel, className }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const other: AppLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const query = Object.fromEntries(searchParams.entries());
  // usePathname renvoie le chemin interne (ex. /projets/[slug]) : on réinjecte les params.
  const { locale: _ignored, ...routeParams } = params as Record<string, string>;
  void _ignored;
  const href = { pathname, params: routeParams, query } as unknown as LinkHref;

  return (
    <div role="group" aria-label={label} className={`${styles.locale} ${className ?? ""}`}>
      {routing.locales.map((l) =>
        l === locale ? (
          <span key={l} className={styles.localeCurrent} aria-current="true" title={currentLabel}>
            <span aria-hidden="true">{l.toUpperCase()}</span>
            <span className="sr-only">{currentLabel}</span>
          </span>
        ) : (
          <Link
            key={l}
            href={href}
            locale={other}
            hrefLang={other}
            lang={other}
            className={styles.localeLink}
            aria-label={switchLabel}
          >
            {l.toUpperCase()}
          </Link>
        ),
      )}
    </div>
  );
}
