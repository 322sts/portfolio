import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge/Badge";
import { getProjectForEdit, getTaxonomyOptions } from "@/lib/admin/queries";
import { cloudinaryEnabled } from "@/lib/cloudinary/server";
import { PageHeader } from "../../_components/PageHeader";
import styles from "../../_components/admin.module.css";
import { projectToValues } from "../_components/form-values";
import { ProjectForm } from "../_components/ProjectForm";

export const metadata: Metadata = { title: "Modifier le projet" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enregistre?: string }>;
};

export default async function AdminEditProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { enregistre } = await searchParams;
  const project = await getProjectForEdit(id);
  if (!project) notFound();
  const { categories, technologies } = await getTaxonomyOptions();
  const values = projectToValues(project);
  const hasEn = project.translations.some((t) => t.locale === "en");

  const flash =
    enregistre === "publie"
      ? "Projet créé et publié."
      : enregistre === "brouillon"
        ? "Projet créé en brouillon (invisible sur le site)."
        : null;

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A1.2"
        title={values.fr.title || project.slug}
        lede={
          <>
            <Badge tone={project.status === "PUBLISHED" ? "ok" : "neutral"}>{project.status === "PUBLISHED" ? "Publié" : "Brouillon"}</Badge>{" "}
            {!hasEn ? <Badge tone="mark">EN manquante</Badge> : null} Dernière modification :{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(project.updatedAt)}
          </>
        }
        actions={
          <>
            <Link href="/admin/projets">← Projets</Link>
            <Link href={`/admin/projets/${project.id}/apercu`}>Aperçu</Link>
            {project.status === "PUBLISHED" ? (
              <a href={`/projets/${project.slug}`} target="_blank" rel="noopener">
                Voir en ligne ↗
              </a>
            ) : null}
          </>
        }
      />
      <ProjectForm initial={values} categories={categories} technologies={technologies} cloudinary={cloudinaryEnabled} flash={flash} />
    </main>
  );
}
