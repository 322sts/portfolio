import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/badge/Badge";
import { EmptyState } from "@/components/empty-state/EmptyState";
import type { CommentStatus } from "@/generated/prisma/enums";
import { getAdminComments } from "@/lib/admin/queries";
import { deleteComment, setCommentStatus } from "@/server/actions/admin/moderation";
import { ActionButton, ConfirmAction } from "../_components/ActionButton";
import { formatDateTime, PageHeader } from "../_components/PageHeader";
import styles from "../_components/admin.module.css";

export const metadata: Metadata = { title: "Commentaires" };

const FILTERS = [
  { key: "en-attente", label: "En attente", status: "PENDING" },
  { key: "valides", label: "Validés", status: "APPROVED" },
  { key: "rejetes", label: "Rejetés", status: "REJECTED" },
  { key: "tous", label: "Tous", status: null },
] as const satisfies ReadonlyArray<{ key: string; label: string; status: CommentStatus | null }>;

const STATUS_LABEL: Record<CommentStatus, { text: string; tone: "mark" | "ok" | "danger" }> = {
  PENDING: { text: "En attente", tone: "mark" },
  APPROVED: { text: "Validé", tone: "ok" },
  REJECTED: { text: "Rejeté", tone: "danger" },
};

type Props = { searchParams: Promise<{ statut?: string }> };

export default async function AdminCommentsPage({ searchParams }: Props) {
  const { statut } = await searchParams;
  const filter = FILTERS.find((f) => f.key === statut) ?? FILTERS[0];
  const { rows, counts } = await getAdminComments(filter.status);
  const countFor = (s: CommentStatus | null) => (s ? counts[s] : counts.PENDING + counts.APPROVED + counts.REJECTED);

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader code="A4" title="Commentaires" lede="Seuls les commentaires validés sont affichés sur le site. Texte brut, affiché tel quel (aucun HTML interprété)." />

      <nav aria-label="Filtrer par statut" className={styles.filters}>
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/commentaires?statut=${f.key}`} className={styles.filter} aria-current={f.key === filter.key ? "page" : undefined}>
            {f.label} <span aria-label={`${countFor(f.status)} commentaire(s)`}>({countFor(f.status)})</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title={`Aucun commentaire « ${filter.label.toLowerCase()} ».`} />
      ) : (
        <ul className={styles.list} role="list">
          {rows.map((c) => {
            const title = c.project.translations[0]?.title ?? c.project.slug;
            const s = STATUS_LABEL[c.status];
            return (
              <li key={c.id} className={styles.listItem}>
                <span>
                  <Badge tone={s.tone}>{s.text}</Badge> <strong>{c.user.email}</strong>
                  {c.user.name ? <span className={styles.muted}> ({c.user.name})</span> : null} sur{" "}
                  <Link href={`/admin/projets/${c.project.id}`}>{title}</Link>
                  {c.project.status === "PUBLISHED" ? (
                    <>
                      {" "}
                      <a href={`/projets/${c.project.slug}`} target="_blank" rel="noopener" className={styles.meta}>
                        (en ligne ↗)
                      </a>
                    </>
                  ) : (
                    <span className={styles.meta}> (projet en brouillon)</span>
                  )}
                </span>
                <span className={styles.meta}>{formatDateTime(c.createdAt)}</span>
                <p className={styles.excerpt}>{c.body}</p>
                <span className={styles.rowActions}>
                  {c.status !== "APPROVED" ? (
                    <ActionButton action={setCommentStatus.bind(null, c.id, "APPROVED")} variant="primary" pendingLabel="…">
                      Valider
                    </ActionButton>
                  ) : null}
                  {c.status !== "REJECTED" ? (
                    <ActionButton action={setCommentStatus.bind(null, c.id, "REJECTED")} pendingLabel="…">
                      Rejeter
                    </ActionButton>
                  ) : null}
                  {c.status !== "PENDING" ? (
                    <ActionButton action={setCommentStatus.bind(null, c.id, "PENDING")} variant="ghost" pendingLabel="…">
                      Remettre en attente
                    </ActionButton>
                  ) : null}
                  <ConfirmAction action={deleteComment.bind(null, c.id)} question="Supprimer définitivement ce commentaire ?">
                    Supprimer
                  </ConfirmAction>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
