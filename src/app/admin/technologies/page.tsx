import type { Metadata } from "next";
import { getAdminTechnologies } from "@/lib/admin/queries";
import { PageHeader } from "../_components/PageHeader";
import { TechnologyEditor } from "../_components/TaxonomyEditors";
import styles from "../_components/admin.module.css";

export const metadata: Metadata = { title: "Technologies" };

export default async function AdminTechnologiesPage() {
  const technologies = await getAdminTechnologies();
  return (
    <main id="contenu" className={styles.page}>
      <PageHeader code="A3" title="Technologies" lede="Affichées sur les planches (1re techno du projet) et dans les filtres (?tech=slug)." />
      <section className={styles.section} aria-labelledby="tech-new">
        <h2 id="tech-new" className={styles.sectionTitle}>
          Ajouter
        </h2>
        <TechnologyEditor initial={{ slug: "", name: "" }} />
      </section>
      <section className={styles.section} aria-labelledby="tech-list">
        <h2 id="tech-list" className={styles.sectionTitle}>
          Technologies existantes ({technologies.length})
        </h2>
        {technologies.map((t) => (
          <TechnologyEditor key={t.id} initial={t} />
        ))}
      </section>
    </main>
  );
}
