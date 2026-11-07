import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClassName } from "@/components/form";
import { Icon } from "@/components/icons/Icon";
import { Prose } from "@/components/prose/Prose";
import { Sheet } from "@/components/sheet/Sheet";
import { sheetFor } from "@/components/site-header/nav-items";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { Link } from "@/lib/i18n/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getPublicProfile } from "@/lib/queries/site";
import { asLocale, pageMetadata } from "../_lib/seo";
import { isOptimizableImage } from "../_lib/images";
import styles from "./about.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "about" });
  return pageMetadata({
    locale,
    href: "/a-propos",
    title: t("title"),
    description: t("metaDescription"),
    type: "profile",
  });
}

export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  const profile = await getPublicProfile(locale);
  const [t, tn] = await Promise.all([getTranslations("about"), getTranslations("nav")]);
  // La bio est saisie dans l'admin : même pipeline Markdown sécurisé que les projets.
  const bio = profile.bio ? await renderMarkdown(profile.bio, { locale }) : null;
  const focus = [t("focusFinance"), t("focusMaths"), t("focusAi"), t("focusCs")];

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">
          {tn("sheet")} 03 · {tn("about")}
        </p>
        <h1>{t("title")}</h1>
      </header>

      <Sheet stamp={t("stamp")} aria-labelledby="profil">
        <div className={profile.photoUrl ? styles.withPhoto : undefined}>
          {profile.photoUrl ? (
            <div className={styles.photo}>
              <Image
                src={profile.photoUrl}
                alt={t("photoAlt")}
                fill
                sizes="(min-width: 900px) 240px, 60vw"
                unoptimized={!isOptimizableImage(profile.photoUrl)}
                className={styles.photoImg}
              />
            </div>
          ) : null}
          <Prose>
            <h2 id="profil">{t("profile")}</h2>
            <p className={styles.name}>Alban Grelaud</p>
            {bio ? (
              <div lang={profile.bioLocale === locale ? undefined : profile.bioLocale}>{bio}</div>
            ) : null}

            <h2>{t("focus")}</h2>
            <ul>
              {focus.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <h2>{t("education")}</h2>
            <p>{t("educationValue")}</p>

            <h2>{t("links")}</h2>
            <ul>
              <li>
                <a href={profile.githubUrl} rel="me noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href={profile.linkedinUrl} rel="me noopener noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            </ul>
          </Prose>
        </div>

        <div className={styles.actions}>
          {profile.cvUrl ? (
            <a href={profile.cvUrl} className={buttonClassName({ variant: "primary" })} rel="noopener noreferrer">
              {t("cv")} <Icon name="arrowUpRight" size={14} />
            </a>
          ) : null}
          <Link href="/projets" className={buttonClassName({ variant: "secondary" })}>
            {t("seeProjects")} <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </Sheet>

      <TitleBlock title={tn("about")} sheet={sheetFor("about")} revision={profile.updatedAt} />
    </main>
  );
}
