import type { Metadata } from "next";
import Link from "next/link";
import { getTaxonomyOptions } from "@/lib/admin/queries";
import { cloudinaryEnabled } from "@/lib/cloudinary/server";
import { PageHeader } from "../../_components/PageHeader";
import styles from "../../_components/admin.module.css";
import { emptyProjectValues } from "../_components/form-values";
import { ProjectForm } from "../_components/ProjectForm";

export const metadata: Metadata = { title: "Nouveau projet" };

export default async function AdminNewProjectPage() {
  const { categories, technologies } = await getTaxonomyOptions();
  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A1.1"
        title="Nouveau projet"
        lede="Créé en brouillon par défaut : invisible sur le site tant qu'il n'est pas publié."
        actions={<Link href="/admin/projets">← Retour aux projets</Link>}
      />
      <ProjectForm initial={emptyProjectValues()} categories={categories} technologies={technologies} cloudinary={cloudinaryEnabled} />
    </main>
  );
}
