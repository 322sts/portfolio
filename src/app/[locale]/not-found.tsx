import { getTranslations } from "next-intl/server";
import { buttonClassName } from "@/components/form";
import { Icon } from "@/components/icons/Icon";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import { Link } from "@/lib/i18n/navigation";
import styles from "./not-found.module.css";

// 404 localisée (agent 4) : une feuille absente du jeu de plans — cartouche « FEUILLE ?? ».
export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main id="contenu" className={styles.page}>
      <div className={styles.sheet}>
        <svg className={styles.cross} viewBox="0 0 200 120" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="198" height="118" />
          <path d="M1 1L199 119M199 1L1 119" />
          <path className={styles.axis} d="M100 0v120M0 60h200" />
        </svg>
        <div className={styles.text}>
          <p className="mono-caps">{t("notFoundCode")}</p>
          <h1 className={styles.title}>{t("notFoundSheet")}</h1>
          <p className={styles.lede}>{t("notFoundText")}</p>
          <div className={styles.actions}>
            <Link href="/" className={buttonClassName({ variant: "primary" })}>
              <Icon name="arrowLeft" size={14} /> {t("backHome")}
            </Link>
            <Link href="/projets" className={buttonClassName({ variant: "secondary" })}>
              {t("notFoundProjects")}
            </Link>
          </div>
        </div>
      </div>
      <TitleBlock title={t("notFoundSheet")} sheet={null} />
    </main>
  );
}
