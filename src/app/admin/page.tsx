import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/form";
import { getDashboardData } from "@/lib/admin/queries";
import { cloudinaryEnabled } from "@/lib/cloudinary/server";
import { formatDateTime, PageHeader } from "./_components/PageHeader";
import styles from "./_components/admin.module.css";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminHomePage() {
  const d = await getDashboardData();
  const titleOf = (tr: Array<{ locale: string; title: string }>, slug: string) => tr.find((t) => t.locale === "fr")?.title ?? slug;

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader
        code="A0"
        title="Tableau de bord"
        lede="Vue d'ensemble du contenu. Les chiffres en jaune demandent une action."
        actions={
          <>
            <Link href="/admin/projets/nouveau" className={buttonClassName({ variant: "primary", size: "sm" })}>
              + Nouveau projet
            </Link>
            <a href="/" target="_blank" rel="noopener" className={buttonClassName({ variant: "ghost", size: "sm" })}>
              Site public ↗
            </a>
          </>
        }
      />

      <nav aria-label="Indicateurs">
        <div className={styles.stats}>
          <Link href="/admin/projets" className={styles.stat}>
            <span className={styles.statValue}>{d.published}</span>
            <span className={styles.statLabel}>Projets publiés</span>
          </Link>
          <Link href="/admin/projets" className={styles.stat}>
            <span className={styles.statValue}>{d.drafts.length}</span>
            <span className={styles.statLabel}>Brouillons</span>
          </Link>
          <Link href="/admin/commentaires?statut=en-attente" className={`${styles.stat} ${d.pendingCount ? styles.statAlert : ""}`}>
            <span className={styles.statValue}>{d.pendingCount}</span>
            <span className={styles.statLabel}>Commentaires en attente</span>
          </Link>
          <Link href="/admin/messages" className={`${styles.stat} ${d.unreadCount ? styles.statAlert : ""}`}>
            <span className={styles.statValue}>{d.unreadCount}</span>
            <span className={styles.statLabel}>Messages non lus</span>
          </Link>
          <Link href="/admin/categories" className={styles.stat}>
            <span className={styles.statValue}>{d.categories}</span>
            <span className={styles.statLabel}>Catégories</span>
          </Link>
          <Link href="/admin/technologies" className={styles.stat}>
            <span className={styles.statValue}>{d.technologies}</span>
            <span className={styles.statLabel}>Technologies</span>
          </Link>
        </div>
      </nav>

      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="db-comments">
          <h2 id="db-comments" className={styles.sectionTitle}>
            Commentaires en attente ({d.pendingCount})
          </h2>
          {d.pending.length ? (
            <ul className={styles.list} role="list">
              {d.pending.map((c) => (
                <li key={c.id} className={styles.listItem}>
                  <span>
                    <strong>{c.user.email}</strong> sur{" "}
                    <Link href={`/admin/projets/${c.project.id}`}>{c.project.translations[0]?.title ?? c.project.slug}</Link>
                  </span>
                  <span className={styles.meta}>{formatDateTime(c.createdAt)}</span>
                  <p className={styles.excerpt}>{c.body.length > 180 ? `${c.body.slice(0, 180)}…` : c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Rien à modérer.</p>
          )}
          <Link href="/admin/commentaires?statut=en-attente">Modérer les commentaires →</Link>
        </section>

        <section className={styles.section} aria-labelledby="db-messages">
          <h2 id="db-messages" className={styles.sectionTitle}>
            Messages non lus ({d.unreadCount})
          </h2>
          {d.unread.length ? (
            <ul className={styles.list} role="list">
              {d.unread.map((m) => (
                <li key={m.id} className={styles.listItem}>
                  <Link href={`/admin/messages?id=${m.id}`} prefetch={false} className={styles.unread}>
                    {m.subject || "(sans objet)"}
                  </Link>
                  <span className={styles.meta}>{formatDateTime(m.createdAt)}</span>
                  <span className={styles.meta}>
                    {m.name} — {m.email}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Aucun message non lu.</p>
          )}
          <Link href="/admin/messages">Tous les messages →</Link>
        </section>

        <section className={styles.section} aria-labelledby="db-drafts">
          <h2 id="db-drafts" className={styles.sectionTitle}>
            Brouillons ({d.drafts.length})
          </h2>
          {d.drafts.length ? (
            <ul className={styles.list} role="list">
              {d.drafts.map((p) => (
                <li key={p.id} className={styles.listItem}>
                  <Link href={`/admin/projets/${p.id}`}>{titleOf(p.translations, p.slug)}</Link>
                  <span className={styles.meta}>modifié le {formatDateTime(p.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Aucun brouillon.</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="db-todo">
          <h2 id="db-todo" className={styles.sectionTitle}>
            À compléter
          </h2>
          <ul className={styles.list} role="list">
            {d.missingEn.map((p) => (
              <li key={p.id} className={styles.listItem}>
                <Link href={`/admin/projets/${p.id}`}>Traduction EN manquante : /{p.slug}</Link>
              </li>
            ))}
            {!d.profile?.cvUrl ? (
              <li className={styles.listItem}>
                <Link href="/admin/profil">CV non fourni</Link>
              </li>
            ) : null}
            {!d.profile?.photoUrl ? (
              <li className={styles.listItem}>
                <Link href="/admin/profil">Photo non fournie</Link>
              </li>
            ) : null}
            <li className={styles.listItem}>
              <span>Uploads : {cloudinaryEnabled ? "Cloudinary configuré (envoi direct signé)." : "Cloudinary non configuré — coller des URL https."}</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
