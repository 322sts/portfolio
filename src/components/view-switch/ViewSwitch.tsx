import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { ProjectFilters } from "@/lib/validation/project-filters";
import { Icon } from "@/components/icons/Icon";
import { filtersToQuery } from "@/components/filter-bar/query";
import styles from "./ViewSwitch.module.css";

type Props = {
  /** Filtres courants (la vue change, les autres filtres sont conservés). */
  filters: ProjectFilters;
  className?: string;
};

/** Bascule Planches / Nomenclature : deux liens vers /projets?vue=…, la vue active porte aria-current. */
export async function ViewSwitch({ filters, className }: Props) {
  const t = await getTranslations("ui.view");
  const views = [
    { value: "planches", label: t("plates"), icon: "grid" },
    { value: "nomenclature", label: t("table"), icon: "table" },
  ] as const;

  return (
    <nav aria-label={t("label")} className={`${styles.switch} ${className ?? ""}`}>
      {views.map((v) => {
        const active = filters.vue === v.value;
        return (
          <Link
            key={v.value}
            href={{ pathname: "/projets", query: filtersToQuery({ ...filters, vue: v.value }) }}
            className={styles.option}
            aria-current={active ? "page" : undefined}
            scroll={false}
          >
            <Icon name={v.icon} size={14} />
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
