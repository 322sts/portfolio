import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin/queries";
import { PageHeader } from "../_components/PageHeader";
import { CategoryEditor } from "../_components/TaxonomyEditors";
import styles from "../_components/admin.module.css";

export const metadata: Metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A2"
        title="Catégories"
        lede="Le style de schéma de la 1re catégorie d'un projet détermine le dessin de sa planche. L'ordre croissant fixe l'ordre d'affichage (filtres, planches)."
      />
      <section className={styles.section} aria-labelledby="cat-new">
        <h2 id="cat-new" className={styles.sectionTitle}>
          Ajouter
        </h2>
        <CategoryEditor initial={{ slug: "", nameFr: "", nameEn: "", schematicStyle: "generic", sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 1 }} />
      </section>
      <section className={styles.section} aria-labelledby="cat-list">
        <h2 id="cat-list" className={styles.sectionTitle}>
          Catégories existantes ({categories.length})
        </h2>
        {categories.map((c) => (
          <CategoryEditor key={c.id} initial={c} />
        ))}
      </section>
    </main>
  );
}
