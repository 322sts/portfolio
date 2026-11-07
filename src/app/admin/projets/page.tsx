import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/badge/Badge";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { buttonClassName } from "@/components/form";
import { Notice } from "@/components/notice/Notice";
import { getAdminProjects } from "@/lib/admin/queries";
import { deleteProject, moveProject, setProjectFeatured, setProjectStatus } from "@/server/actions/admin/projects";
import { ActionButton, ConfirmAction } from "../_components/ActionButton";
import { formatMonth, PageHeader } from "../_components/PageHeader";
import styles from "../_components/admin.module.css";

export const metadata: Metadata = { title: "Projets" };

type Props = { searchParams: Promise<{ supprime?: string }> };

export default async function AdminProjectsPage({ searchParams }: Props) {
  const { supprime } = await searchParams;
  const projects = await getAdminProjects();
  const published = projects.filter((p) => p.status === "PUBLISHED").length;

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A1"
        title="Projets"
        lede={`${projects.length} projet(s) : ${published} publié(s), ${projects.length - published} brouillon(s). L'ordre manuel (Ordre) départage les projets d'un même mois sur le site.`}
        actions={
          <Link href="/admin/projets/nouveau" className={buttonClassName({ variant: "primary" })}>
            + Nouveau projet
          </Link>
        }
      />
      {supprime ? <Notice tone="success">Projet supprimé.</Notice> : null}

      {projects.length === 0 ? (
        <EmptyState title="Aucun projet." action={<Link href="/admin/projets/nouveau">Créer le premier projet</Link>} />
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Tableau des projets (défilement horizontal)">
          <table className={styles.table}>
            <caption className="sr-only">Projets, dans l&apos;ordre manuel</caption>
            <thead>
              <tr>
                <th scope="col">Ordre</th>
                <th scope="col">Titre</th>
                <th scope="col">Statut</th>
                <th scope="col">Date</th>
                <th scope="col">Catégories</th>
                <th scope="col">IA</th>
                <th scope="col">En avant</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const title = p.titleFr ?? p.slug;
                return (
                  <tr key={p.id}>
                    <td className={styles.num}>
                      <span className={styles.rowActions}>
                        {String(i + 1).padStart(2, "0")}
                        <ActionButton action={moveProject.bind(null, p.id, "up")} variant="ghost" disabled={i === 0} aria-label={`Monter « ${title} »`}>
                          ↑
                        </ActionButton>
                        <ActionButton action={moveProject.bind(null, p.id, "down")} variant="ghost" disabled={i === projects.length - 1} aria-label={`Descendre « ${title} »`}>
                          ↓
                        </ActionButton>
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/projets/${p.id}`} className={styles.rowTitle}>
                        {title}
                      </Link>
                      <div className={styles.meta}>
                        /{p.slug}
                        {!p.hasEn ? " · EN manquante" : ""}
                        {p.pendingComments ? (
                          <>
                            {" · "}
                            <Link href="/admin/commentaires">{p.pendingComments} commentaire(s) en attente</Link>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Badge tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status === "PUBLISHED" ? "Publié" : "Brouillon"}</Badge>
                    </td>
                    <td className={styles.num}>{formatMonth(p.date)}</td>
                    <td>
                      <span className={styles.tags}>{p.categories.length ? p.categories.join(", ") : <span className={styles.muted}>—</span>}</span>
                    </td>
                    <td>{p.aiAssisted ? <Badge tone="mark">IA</Badge> : <span className={styles.muted}>non</span>}</td>
                    <td>
                      <ActionButton
                        action={setProjectFeatured.bind(null, p.id, !p.featured)}
                        variant={p.featured ? "primary" : "ghost"}
                        aria-label={p.featured ? `Ne plus mettre en avant « ${title} »` : `Mettre en avant « ${title} »`}
                      >
                        {p.featured ? "★ Oui" : "☆ Non"}
                      </ActionButton>
                    </td>
                    <td>
                      <span className={styles.rowActions}>
                        <Link href={`/admin/projets/${p.id}`} className={buttonClassName({ variant: "secondary", size: "sm" })}>
                          Modifier
                        </Link>
                        {p.status === "PUBLISHED" ? (
                          <ActionButton action={setProjectStatus.bind(null, p.id, "DRAFT")} pendingLabel="…" aria-label={`Dépublier « ${title} »`}>
                            Dépublier
                          </ActionButton>
                        ) : (
                          <ActionButton action={setProjectStatus.bind(null, p.id, "PUBLISHED")} variant="primary" pendingLabel="…" aria-label={`Publier « ${title} »`}>
                            Publier
                          </ActionButton>
                        )}
                        <Link href={`/admin/projets/${p.id}/apercu`} className={buttonClassName({ variant: "ghost", size: "sm" })}>
                          Aperçu
                        </Link>
                        {p.status === "PUBLISHED" ? (
                          <a href={`/projets/${p.slug}`} target="_blank" rel="noopener" className={buttonClassName({ variant: "ghost", size: "sm" })}>
                            Voir en ligne ↗
                          </a>
                        ) : null}
                        <ConfirmAction action={deleteProject.bind(null, p.id)} question={`Supprimer « ${title} » ?`} aria-label={`Supprimer « ${title} »`}>
                          Supprimer
                        </ConfirmAction>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
