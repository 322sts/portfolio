import "server-only";
import { revalidatePath } from "next/cache";

/*
 * Invalidation des pages publiques après une écriture admin.
 * Les URL publiques (/projets, /en/projects…) sont des réécritures next-intl vers
 * `src/app/[locale]/…` : on invalide donc les routes internes par motif, ce qui couvre
 * FR et EN, liste et détail, quel que soit le slug.
 */

function revalidateCommon(): void {
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin", "layout");
}

/** Projets (et tout ce qui les affiche : accueil, liste, détail, palette, sitemap). */
export function revalidateProjects(): void {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/projets", "page");
  revalidatePath("/[locale]/projets/[slug]", "page");
  // La palette de commandes du layout public liste les projets publiés.
  revalidatePath("/[locale]", "layout");
  revalidateCommon();
}

/** Catégories et technologies : libellés visibles sur les planches, les filtres et le détail. */
export const revalidateTaxonomy = revalidateProjects;

/** Commentaires : affichés sur le détail projet et dans « mon compte ». */
export function revalidateComments(): void {
  revalidatePath("/[locale]/projets/[slug]", "page");
  revalidatePath("/[locale]/compte", "page");
  revalidateCommon();
}

/** Profil : accueil, à propos, contact, pied de page (layout). */
export function revalidateProfile(): void {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/a-propos", "page");
  revalidatePath("/[locale]/contact", "page");
  revalidateCommon();
}

/** Messages : uniquement des vues admin. */
export function revalidateMessages(): void {
  revalidatePath("/admin", "layout");
}
