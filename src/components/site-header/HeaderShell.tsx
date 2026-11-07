"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "@/lib/i18n/navigation";
import { Icon } from "@/components/icons/Icon";
import styles from "./SiteHeader.module.css";

type Props = {
  brand: React.ReactNode;
  /** Contenu du panneau (navigation + outils) : en ligne sur desktop, menu déroulant sur mobile. */
  children: React.ReactNode;
  /** Éléments toujours visibles à droite (bouton palette). */
  aside?: React.ReactNode;
  labels: { menu: string; open: string; close: string };
};

/**
 * Coque client de l'en-tête : seul le menu mobile a besoin d'état.
 * Le panneau est un seul arbre DOM (pas de doublon) : affiché en ligne au-delà de 1200 px,
 * replié derrière un bouton « Menu » en dessous. Échap ou un changement de page le referment.
 */
export function HeaderShell({ brand, children, aside, labels }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fermer à chaque navigation (ajustement d'état pendant le rendu, cf. doc React).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {brand}
        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? labels.close : labels.open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={18} />
          <span aria-hidden="true">{labels.menu}</span>
        </button>
        <div ref={panelRef} id={panelId} className={styles.panel} data-open={open}>
          {children}
        </div>
        {aside ? <div className={styles.barEnd}>{aside}</div> : null}
      </div>
    </header>
  );
}
