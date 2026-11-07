import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MAIN_SHEETS, SHEET_TOTAL } from "@/components/site-header/nav-items";
import styles from "./SiteFooter.module.css";

export type FooterProfile = {
  githubUrl: string;
  linkedinUrl: string;
  email: string;
};

// Valeurs de la SPEC §0, utilisées si le profil (SiteProfile) n'est pas fourni.
const DEFAULT_PROFILE: FooterProfile = {
  githubUrl: "https://github.com/322sts",
  linkedinUrl: "https://www.linkedin.com/in/albangrelaud/",
  email: "albangrelaud@proton.me",
};

type Props = { profile?: FooterProfile };

/** Pied de page : légende du jeu de plans (feuilles 01–04), liens externes, mentions. */
export async function SiteFooter({ profile = DEFAULT_PROFILE }: Props) {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.col}>
        <h2 className={styles.heading}>
          {t("drawingSet")} · {t("sheets", { count: SHEET_TOTAL })}
        </h2>
        <ol role="list" className={styles.sheets}>
          {MAIN_SHEETS.map((s) => (
            <li key={s.href}>
              <span className={styles.num} aria-hidden="true">
                {String(s.number).padStart(2, "0")}
              </span>
              <Link href={s.href}>{tn(s.key)}</Link>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.col}>
        <h2 className={styles.heading}>{t("links")}</h2>
        <ul role="list" className={styles.links}>
          <li>
            <a href={profile.githubUrl} rel="me">
              {t("github")}
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} rel="me">
              {t("linkedin")}
            </a>
          </li>
          <li>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </li>
        </ul>
      </div>
      <div className={`${styles.col} ${styles.meta}`}>
        <p>{t("rights", { year })}</p>
        <p>{t("builtWith")}</p>
        <p aria-hidden="true">{t("scale")}</p>
      </div>
    </footer>
  );
}
