"use client";

import { useEffect, useState } from "react";
import { applyTheme } from "./client";
import { THEME_EVENT, THEME_PREFERENCES, type ThemePreference } from "./theme";
import styles from "./ThemeToggle.module.css";

export type ThemeToggleLabels = {
  /** Nom accessible du groupe (ex. « Thème »). */
  legend: string;
  system: string;
  light: string;
  dark: string;
  /** Libellés courts visibles (ex. AUTO / CALQUE / CYANO). */
  short: { system: string; light: string; dark: string };
};

type Props = {
  /** Préférence lue côté serveur dans le cookie. */
  initial: ThemePreference;
  labels: ThemeToggleLabels;
  className?: string;
};

/** Bascule de thème à trois positions (système / calque / cyanotype), sans rechargement. */
export function ThemeToggle({ initial, labels, className }: Props) {
  const [pref, setPref] = useState<ThemePreference>(initial);

  // Reste synchronisé si le thème est changé ailleurs (palette de commandes).
  useEffect(() => {
    const onChange = (e: Event) => setPref((e as CustomEvent<ThemePreference>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  return (
    <div role="group" aria-label={labels.legend} className={`${styles.root} ${className ?? ""}`}>
      {THEME_PREFERENCES.map((value) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-pressed={pref === value}
          aria-label={labels[value]}
          title={labels[value]}
          onClick={() => {
            setPref(value);
            applyTheme(value);
          }}
        >
          <span aria-hidden="true">{labels.short[value]}</span>
        </button>
      ))}
    </div>
  );
}
