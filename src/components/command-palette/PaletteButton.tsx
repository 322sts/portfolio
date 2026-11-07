"use client";

import { Icon } from "@/components/icons/Icon";
import { openCommandPalette } from "./events";
import styles from "./CommandPalette.module.css";

type Props = { label: string; ariaLabel: string; shortcut: string };

/** Bouton d'en-tête qui ouvre la palette de commandes (raccourci affiché sur desktop). */
export function PaletteButton({ label, ariaLabel, shortcut }: Props) {
  return (
    <button
      type="button"
      className={styles.trigger}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K /"
      onClick={openCommandPalette}
    >
      <Icon name="search" size={16} />
      <span className={styles.triggerLabel} aria-hidden="true">
        {label}
      </span>
      <kbd className={styles.triggerKbd} aria-hidden="true">
        {shortcut}
      </kbd>
    </button>
  );
}
