import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/badge/Badge";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { getAdminMessages, readMessage } from "@/lib/admin/queries";
import { deleteMessage, setMessageRead } from "@/server/actions/admin/moderation";
import { ActionButton, ConfirmAction } from "../_components/ActionButton";
import { formatDateTime, PageHeader } from "../_components/PageHeader";
import styles from "../_components/admin.module.css";

export const metadata: Metadata = { title: "Messages" };

type Props = { searchParams: Promise<{ id?: string }> };

export default async function AdminMessagesPage({ searchParams }: Props) {
  const { id } = await searchParams;
  // Ouvrir un message (clic explicite, liens sans prefetch) le marque comme lu.
  const selected = id && id.length <= 64 ? await readMessage(id) : null;
  const messages = await getAdminMessages();
  const unread = messages.filter((m) => !m.read).length;

  return (
    <main id="contenu" className={styles.page}>
      <PageHeader code="A5" title="Messages" lede={`${messages.length} message(s), dont ${unread} non lu(s). Formulaire de contact du site.`} />

      {selected ? (
        <article className={styles.panel} aria-labelledby="msg-subject">
          <div className={styles.panelHead}>
            <h2 id="msg-subject" className={styles.sectionTitle}>
              {selected.subject || "(sans objet)"}
            </h2>
            <Link href="/admin/messages">Fermer</Link>
          </div>
          <dl className={styles.dl}>
            <dt>De</dt>
            <dd>{selected.name}</dd>
            <dt>Email</dt>
            {/* Affiché en texte (pas de lien) : l'adresse est saisie par le visiteur. */}
            <dd>
              <code>{selected.email}</code>
            </dd>
            <dt>Reçu le</dt>
            <dd>{formatDateTime(selected.createdAt)}</dd>
          </dl>
          <p className={styles.messageBody}>{selected.body}</p>
          <div className={styles.rowActions}>
            <ActionButton action={setMessageRead.bind(null, selected.id, false)} redirectTo="/admin/messages">
              Marquer comme non lu
            </ActionButton>
            <ConfirmAction action={deleteMessage.bind(null, selected.id)} question="Supprimer définitivement ce message ?" redirectTo="/admin/messages">
              Supprimer
            </ConfirmAction>
          </div>
        </article>
      ) : id ? (
        <p className={styles.inlineError} role="alert">
          Message introuvable (supprimé ?).
        </p>
      ) : null}

      {messages.length === 0 ? (
        <EmptyState title="Aucun message reçu." />
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Liste des messages">
          <table className={styles.table}>
            <caption className="sr-only">Messages reçus, du plus récent au plus ancien</caption>
            <thead>
              <tr>
                <th scope="col">État</th>
                <th scope="col">Objet</th>
                <th scope="col">Expéditeur</th>
                <th scope="col">Email</th>
                <th scope="col">Reçu le</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className={selected?.id === m.id ? styles.selectedRow : undefined}>
                  <td>{m.read ? <span className={styles.muted}>lu</span> : <Badge tone="mark">Non lu</Badge>}</td>
                  <td>
                    <Link href={`/admin/messages?id=${m.id}`} prefetch={false} className={m.read ? undefined : styles.unread} aria-current={selected?.id === m.id ? "true" : undefined}>
                      {m.subject || "(sans objet)"}
                    </Link>
                  </td>
                  <td>{m.name}</td>
                  <td>
                    <code>{m.email}</code>
                  </td>
                  <td className={styles.num}>{formatDateTime(m.createdAt)}</td>
                  <td>
                    <span className={styles.rowActions}>
                      {m.read ? (
                        <ActionButton action={setMessageRead.bind(null, m.id, false)} variant="ghost">
                          Non lu
                        </ActionButton>
                      ) : (
                        <ActionButton action={setMessageRead.bind(null, m.id, true)} variant="ghost">
                          Marquer lu
                        </ActionButton>
                      )}
                      <ConfirmAction action={deleteMessage.bind(null, m.id)} question="Supprimer ce message ?" aria-label={`Supprimer le message « ${m.subject} »`}>
                        Supprimer
                      </ConfirmAction>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
