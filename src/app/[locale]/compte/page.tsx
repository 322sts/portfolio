import type { Metadata } from "next";
import NextLink from "next/link";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/routing";
import { logout } from "@/server/actions/auth";
import { deleteOwnComment } from "@/server/actions/comments";
import { listMyFavorites, toggleFavorite } from "@/server/actions/favorites";
import { Badge } from "@/components/badge/Badge";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Button, buttonClassName } from "@/components/form";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import styles from "../connexion/auth.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

// Adaptateurs <form action> : les actions renvoient un ActionResult, un formulaire attend void.
async function removeFavorite(formData: FormData): Promise<void> {
  "use server";
  await toggleFavorite(String(formData.get("projectId") ?? ""));
}

async function removeComment(formData: FormData): Promise<void> {
  "use server";
  await deleteOwnComment(String(formData.get("commentId") ?? ""));
}

export default async function AccountPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  // Session obligatoire : sinon redirection vers la connexion (callbackUrl = cette page).
  const user = await requireUser();
  const t = await getTranslations("account");
  const format = await getFormatter();

  const favorites = await listMyFavorites();
  const comments = await db.comment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      status: true,
      createdAt: true,
      project: { select: { slug: true, status: true, translations: { select: { locale: true, title: true } } } },
    },
  });

  const statusTone = { PENDING: "mark", APPROVED: "ok", REJECTED: "danger" } as const;
  const statusLabel = { PENDING: t("statusPENDING"), APPROVED: t("statusAPPROVED"), REJECTED: t("statusREJECTED") };

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">{t("signedInAs", { email: user.email })}</p>
        <h1>{t("title")}</h1>
        <p className={styles.intro}>{t("intro")}</p>
      </header>

      <section className={styles.section} aria-labelledby="favoris">
        <h2 id="favoris" className={styles.sectionTitle}>
          {t("favorites")}
        </h2>
        {favorites.ok && favorites.data.length > 0 ? (
          <ul className={styles.list}>
            {favorites.data.map((f) => (
              <li key={f.projectId} className={styles.item}>
                <Link href={{ pathname: "/projets/[slug]", params: { slug: f.slug } }}>{f.title}</Link>
                <form action={removeFavorite}>
                  <input type="hidden" name="projectId" value={f.projectId} />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`${t("removeFavorite")} : ${f.title}`}>
                    {t("removeFavorite")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("noFavorites")} />
        )}
      </section>

      <section className={styles.section} aria-labelledby="commentaires">
        <h2 id="commentaires" className={styles.sectionTitle}>
          {t("comments")}
        </h2>
        {comments.length > 0 ? (
          <ul className={styles.list}>
            {comments.map((c) => {
              const tr = c.project.translations.find((x) => x.locale === locale) ?? c.project.translations[0];
              const title = tr?.title ?? c.project.slug;
              return (
                <li key={c.id} className={styles.item}>
                  <div>
                    <p className={styles.meta}>
                      {c.project.status === "PUBLISHED" ? (
                        <Link href={{ pathname: "/projets/[slug]", params: { slug: c.project.slug } }}>
                          {t("onProject", { title })}
                        </Link>
                      ) : (
                        t("onProject", { title })
                      )}{" "}
                      · <time dateTime={c.createdAt.toISOString()}>{format.dateTime(c.createdAt, { dateStyle: "medium" })}</time>
                    </p>
                    {/* Texte brut, échappé par React (SPEC §5). */}
                    <p className={styles.itemBody}>{c.body}</p>
                  </div>
                  <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                  <form action={removeComment}>
                    <input type="hidden" name="commentId" value={c.id} />
                    <Button type="submit" variant="danger" size="sm">
                      {t("deleteComment")}
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={t("noComments")} />
        )}
      </section>

      <div className={styles.actions}>
        {user.role === "ADMIN" ? (
          <NextLink href="/admin" className={buttonClassName({ variant: "secondary" })}>
            {t("admin")}
          </NextLink>
        ) : null}
        <form action={logout}>
          <Button type="submit">{t("logout")}</Button>
        </form>
      </div>
      <TitleBlock title={t("title")} sheet={null} />
    </main>
  );
}
