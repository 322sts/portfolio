import { Archivo, JetBrains_Mono } from "next/font/google";

// Polices auto-hébergées par next/font (SPEC §1).
// Archivo variable : axe wght (100–900) + axe wdth (62–125) pour les titres étirés / texte étroit.
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-display",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-mono",
});

/** Classes à poser sur <html> pour exposer les variables CSS des polices. */
export const fontVariables = `${archivo.variable} ${jetbrainsMono.variable}`;
