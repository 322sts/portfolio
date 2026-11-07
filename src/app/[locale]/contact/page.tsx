import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/icons/Icon";
import { sheetFor } from "@/components/site-header/nav-items";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { getPublicProfile } from "@/lib/queries/site";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";
import { asLocale, pageMetadata } from "../_lib/seo";
import { ContactForm } from "./contact-form";
import styles from "./contact.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, href: "/contact", title: t("title"), description: t("metaDescription") });
}

export default async function ContactPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  const profile = await getPublicProfile(locale);
  const [t, tn] = await Promise.all([getTranslations("contact"), getTranslations("nav")]);

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">
          {tn("sheet")} 04 · {tn("contact")}
        </p>
        <h1>{t("title")}</h1>
        <p className={styles.intro}>{t("intro")}</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="formulaire">
          <h2 id="formulaire" className={styles.panelTitle}>
            {t("formTitle")}
          </h2>
          <ContactForm turnstileSiteKey={getTurnstileSiteKey()} />
        </section>

        <section className={styles.details} aria-labelledby="coordonnees">
          <h2 id="coordonnees" className={styles.panelTitle}>
            {t("direct")}
          </h2>
          <dl className={styles.dl}>
            <div>
              <dt>{t("email")}</dt>
              <dd>
                <a href={`mailto:${profile.email}`} className={styles.email}>
                  {profile.email}
                </a>
              </dd>
            </div>
            <div>
              <dt>GitHub</dt>
              <dd>
                <a href={profile.githubUrl} rel="me noopener noreferrer" className={styles.link}>
                  {profile.githubUrl.replace(/^https?:\/\/(www\.)?/, "")} <Icon name="arrowUpRight" size={14} />
                </a>
              </dd>
            </div>
            <div>
              <dt>LinkedIn</dt>
              <dd>
                <a href={profile.linkedinUrl} rel="me noopener noreferrer" className={styles.link}>
                  {profile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}{" "}
                  <Icon name="arrowUpRight" size={14} />
                </a>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <TitleBlock title={tn("contact")} sheet={sheetFor("contact")} revision={profile.updatedAt} />
    </main>
  );
}
