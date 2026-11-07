"use client";

import { useEffect, useRef } from "react";
import styles from "./Frame.module.css";

// 1 mm CSS = 96 / 25,4 px.
const PX_PER_MM = 96 / 25.4;

const fmt = (mm: number) => mm.toFixed(1).padStart(5, "0");

/**
 * Coordonnées du curseur en mm, relatives au coin haut-gauche du document.
 * Décoratif (aria-hidden), desktop uniquement : désactivé sur pointeur grossier.
 * Mise à jour directe du texte (pas de re-rendu React) une fois par frame.
 */
export function CursorCoords() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      el.textContent = `X ${fmt(x / PX_PER_MM)}  Y ${fmt(y / PX_PER_MM)} mm`;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x = e.pageX;
      y = e.pageY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const bind = () => {
      if (fine.matches) window.addEventListener("pointermove", onMove, { passive: true });
      else window.removeEventListener("pointermove", onMove);
    };

    bind();
    fine.addEventListener("change", bind);
    return () => {
      fine.removeEventListener("change", bind);
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span ref={ref} className={styles.coords} aria-hidden="true">
      X 000.0  Y 000.0 mm
    </span>
  );
}
