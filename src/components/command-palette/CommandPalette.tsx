"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, type AppLocale } from "@/lib/i18n/routing";
import { Icon } from "@/components/icons/Icon";
import type { StaticPathname } from "@/components/site-header/MainNav";
import { MAIN_SHEETS } from "@/components/site-header/nav-items";
import type { ThemePreference } from "@/components/theme/theme";
import { applyTheme } from "@/components/theme/client";
import { PALETTE_OPEN_EVENT } from "./events";
import { fuzzyScore } from "./fuzzy";
import styles from "./CommandPalette.module.css";

export type PaletteProject = {
  slug: string;
  title: string;
  plateNumber: number;
  /** Catégorie / technos : mots-clés de recherche et indice affiché. */
  hint?: string;
};

type Props = {
  /** Projets publiés (fournis par le layout via getPublishedProjects). */
  projects: PaletteProject[];
  /** Affiche « Mon compte » plutôt que « Connexion ». */
  isAuthenticated: boolean;
};

type Group = "pages" | "projects" | "actions";
type Action =
  | { type: "nav"; href: StaticPathname }
  | { type: "project"; slug: string }
  | { type: "locale"; locale: AppLocale }
  | { type: "theme"; value: ThemePreference };
type Item = { id: string; group: Group; label: string; hint?: string; keywords?: string; action: Action };

const GROUPS: Group[] = ["pages", "projects", "actions"];

/** Vrai si l'utilisateur est en train de saisir du texte (on ne vole pas la touche « / »). */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Palette de commandes (Ctrl+K, Cmd+K ou « / ») : <dialog> modal natif (focus piégé,
 * Échap), champ role="combobox" + liste role="listbox" pilotée par aria-activedescendant.
 */
export function CommandPalette({ projects, isAuthenticated }: Props) {
  const t = useTranslations("ui.palette");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const baseId = useId();
  const listId = `${baseId}-liste`;

  const show = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setActive(0);
    setOpen(true);
    dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const hide = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Raccourcis globaux + ouverture depuis le bouton d'en-tête.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) hide();
        else show();
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_OPEN_EVENT, show);
    };
  }, [show, hide]);

  const items = useMemo<Item[]>(() => {
    const other: AppLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
    const pages: Item[] = MAIN_SHEETS.map((s) => ({
      id: `page-${s.key}`,
      group: "pages",
      label: tn(s.key),
      hint: `${tn("sheet")} ${String(s.number).padStart(2, "0")}`,
      action: { type: "nav", href: s.href },
    }));
    pages.push(
      isAuthenticated
        ? { id: "page-compte", group: "pages", label: tn("account"), action: { type: "nav", href: "/compte" } }
        : { id: "page-connexion", group: "pages", label: tn("login"), action: { type: "nav", href: "/connexion" } },
    );
    const projectItems: Item[] = projects.map((p) => ({
      id: `projet-${p.slug}`,
      group: "projects",
      label: p.title,
      hint: `PL. ${String(p.plateNumber).padStart(2, "0")}`,
      keywords: `${p.slug} ${p.hint ?? ""}`,
      action: { type: "project", slug: p.slug },
    }));
    const actions: Item[] = [
      {
        id: "action-langue",
        group: "actions",
        label: t("switchLocale"),
        hint: other.toUpperCase(),
        keywords: "langue language english français",
        action: { type: "locale", locale: other },
      },
      { id: "theme-light", group: "actions", label: t("themeLight"), keywords: "theme clair light", action: { type: "theme", value: "light" } },
      { id: "theme-dark", group: "actions", label: t("themeDark"), keywords: "theme sombre dark", action: { type: "theme", value: "dark" } },
      { id: "theme-system", group: "actions", label: t("themeSystem"), keywords: "theme auto systeme", action: { type: "theme", value: "system" } },
    ];
    return [...pages, ...projectItems, ...actions];
  }, [projects, isAuthenticated, locale, t, tn]);

  // Exécution d'une commande (gestionnaire d'événement : pas pendant le rendu).
  const run = (item: Item | undefined) => {
    if (!item) return;
    hide();
    const a = item.action;
    if (a.type === "nav") router.push(a.href);
    else if (a.type === "project") router.push({ pathname: "/projets/[slug]", params: { slug: a.slug } });
    else if (a.type === "theme") applyTheme(a.value);
    else {
      // Chemin interne courant + params dynamiques (même logique que LocaleSwitch).
      const { locale: _l, ...routeParams } = params as Record<string, string>;
      void _l;
      router.replace({ pathname, params: routeParams } as unknown as Parameters<typeof router.replace>[0], {
        locale: a.locale,
      });
    }
  };

  const results = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((item, order) => ({
        item,
        order,
        score: Math.max(fuzzyScore(query, item.label), fuzzyScore(query, item.keywords ?? "") - 100),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((r) => r.item);
  }, [items, query]);

  // Affichage groupé, mais navigation sur l'ordre aplati des groupes.
  // Avec une recherche, les groupes sont ordonnés selon leur meilleur résultat (le 1er = le plus pertinent).
  const groupOrder = query.trim()
    ? [...GROUPS].sort((a, b) => {
        const ia = results.findIndex((r) => r.group === a);
        const ib = results.findIndex((r) => r.group === b);
        return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      })
    : GROUPS;
  const grouped = groupOrder
    .map((g) => ({ group: g, items: results.filter((r) => r.group === g) }))
    .filter((g) => g.items.length);
  const flat = grouped.flatMap((g) => g.items);
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));
  const activeItem = flat[activeIndex];
  const optionId = (item: Item) => `${baseId}-${item.id}`;
  const activeId = activeItem ? optionId(activeItem) : undefined;

  // Garder l'option active visible.
  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % Math.max(1, flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + flat.length) % Math.max(1, flat.length));
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && e.ctrlKey) {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(activeItem);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${baseId}-titre`}
      onClose={() => {
        setOpen(false);
        returnFocus.current?.focus();
      }}
      onClick={(e) => {
        // Clic sur le fond (hors du panneau) : fermeture.
        if (e.target === e.currentTarget) hide();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={`${baseId}-titre`} className={styles.title}>
            {t("title")}
          </h2>
          <button type="button" className={styles.close} onClick={hide} aria-label={tc("close")}>
            <kbd aria-hidden="true">Esc</kbd>
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className={styles.search}>
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? activeId : undefined}
            aria-describedby={`${baseId}-aide`}
            className={styles.input}
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div id={listId} role="listbox" aria-label={t("title")} className={styles.list}>
          {open
            ? grouped.map((g) => (
                <div key={g.group} role="group" aria-labelledby={`${baseId}-g-${g.group}`} className={styles.group}>
                  <div id={`${baseId}-g-${g.group}`} className={styles.groupLabel} role="presentation">
                    {t(g.group)}
                  </div>
                  {g.items.map((item) => {
                    const selected = item === activeItem;
                    return (
                      <div
                        key={item.id}
                        id={optionId(item)}
                        role="option"
                        aria-selected={selected}
                        className={styles.option}
                        onMouseMove={() => setActive(flat.indexOf(item))}
                        onClick={() => run(item)}
                      >
                        <span className={styles.optionLabel}>{item.label}</span>
                        {item.hint ? <span className={styles.optionHint}>{item.hint}</span> : null}
                      </div>
                    );
                  })}
                </div>
              ))
            : null}
          {open && flat.length === 0 ? <p className={styles.empty}>{t("empty")}</p> : null}
        </div>
        <p id={`${baseId}-aide`} className={styles.foot}>
          {t("hint")}
        </p>
        <p className="sr-only" aria-live="polite">
          {open && query ? t("count", { count: flat.length }) : ""}
        </p>
      </div>
    </dialog>
  );
}
