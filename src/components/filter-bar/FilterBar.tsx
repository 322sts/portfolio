"use client";

import { useSyncExternalStore, useTransition } from "react";
import { usePathname as useRawPathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import type { FilterOptions } from "@/lib/queries/projects";
import { parseProjectFilters, type ProjectFilters } from "@/lib/validation/project-filters";
import { Button, buttonClassName, Checkbox, Select } from "@/components/form";
import { filtersToQuery } from "./query";
import styles from "./FilterBar.module.css";

type Props = {
  options: FilterOptions;
  /** Filtres courants (parseProjectFilters(searchParams)). */
  filters: ProjectFilters;
  /** Nombre de résultats, annoncé poliment aux lecteurs d'écran. */
  resultCount?: number;
  className?: string;
};

const noop = () => () => {};

/**
 * Barre de filtres de /projets. Un vrai <form method="get"> (fonctionne sans JS, bouton
 * « Appliquer ») ; avec JS, chaque changement met à jour l'URL immédiatement (router.replace)
 * et le bouton disparaît. Compatible avec src/lib/validation/project-filters.ts.
 */
export function FilterBar({ options, filters, resultCount, className }: Props) {
  const t = useTranslations("projects.filters");
  const tu = useTranslations("ui.filters");
  const tc = useTranslations("common");
  const router = useRouter();
  const rawPathname = useRawPathname();
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const apply = (form: HTMLFormElement) => {
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const next = parseProjectFilters(data);
    startTransition(() => {
      router.replace({ pathname: "/projets", query: filtersToQuery(next) }, { scroll: false });
    });
  };

  return (
    <form
      method="get"
      action={rawPathname}
      className={`${styles.bar} ${className ?? ""}`}
      aria-label={t("label")}
      aria-busy={pending || undefined}
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      {filters.vue !== "planches" ? <input type="hidden" name="vue" value={filters.vue} /> : null}

      <Select
        id="filtre-cat"
        name="cat"
        label={t("category")}
        defaultValue={filters.cat ?? ""}
        placeholder={tu("allFem")}
        options={options.categories.map((c) => ({ value: c.slug, label: `${c.name} (${c.count})` }))}
        className={styles.field}
      />
      <Select
        id="filtre-tech"
        name="tech"
        label={t("technology")}
        defaultValue={filters.tech ?? ""}
        placeholder={tu("allFem")}
        options={options.technologies.map((c) => ({ value: c.slug, label: `${c.name} (${c.count})` }))}
        className={styles.field}
      />
      <Select
        id="filtre-annee"
        name="annee"
        label={t("year")}
        defaultValue={filters.annee ? String(filters.annee) : ""}
        placeholder={tu("allFem")}
        options={options.years.map((y) => ({ value: String(y), label: String(y) }))}
        className={styles.fieldSmall}
      />
      <Select
        id="filtre-equipe"
        name="equipe"
        label={t("team")}
        defaultValue={filters.equipe ?? ""}
        placeholder={tu("any")}
        options={options.teamTypes.map((v) => ({ value: v, label: v === "solo" ? t("solo") : t("teamWork") }))}
        className={styles.fieldSmall}
      />
      <Select
        id="filtre-tri"
        name="tri"
        label={t("sort")}
        defaultValue={filters.tri}
        options={[
          { value: "date", label: t("sortDate") },
          { value: "titre", label: t("sortTitle") },
        ]}
        className={styles.fieldSmall}
      />
      {options.hasAiAssisted || filters.ia ? (
        <Checkbox
          id="filtre-ia"
          name="ia"
          value="1"
          label={t("aiAssisted")}
          defaultChecked={filters.ia}
          className={styles.check}
        />
      ) : null}

      <div className={styles.actions}>
        {hydrated ? null : (
          <Button type="submit" variant="secondary" size="sm">
            {tc("apply")}
          </Button>
        )}
        <Link
          href={{ pathname: "/projets", query: filtersToQuery({ vue: filters.vue }) }}
          className={buttonClassName({ variant: "ghost", size: "sm" })}
          scroll={false}
          onClick={(e) => {
            // Les champs sont non contrôlés : on les remet à zéro avant la navigation.
            const form = e.currentTarget.closest("form");
            form?.querySelectorAll("select").forEach((el) => {
              el.value = el.name === "tri" ? "date" : "";
            });
            form?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((el) => {
              el.checked = false;
            });
          }}
        >
          {t("reset")}
        </Link>
        {resultCount !== undefined ? (
          <p className={styles.count} role="status">
            {tu("results", { count: resultCount })}
          </p>
        ) : null}
      </div>
    </form>
  );
}
