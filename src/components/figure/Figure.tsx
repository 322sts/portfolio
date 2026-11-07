import { getTranslations } from "next-intl/server";
import styles from "./Figure.module.css";

type Props = {
  /** id (cible des CrossRef), ex. « fig-1 ». */
  id: string;
  /** Numéro affiché (explicite : les renvois le citent). */
  number: number | string;
  /** Légende. */
  caption: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Figure numérotée « FIG. n — légende », cadrée, cible de renvoi surlignable. */
export async function Figure({ id, number, caption, children, className }: Props) {
  const t = await getTranslations("ui");
  return (
    <figure id={id} className={`${styles.figure} ${className ?? ""}`} data-xref="">
      <div className={styles.frame}>{children}</div>
      <figcaption className={styles.caption}>
        <span className={styles.number}>
          {t("figure")} {number}
        </span>
        <span className={styles.text}>{caption}</span>
      </figcaption>
    </figure>
  );
}
