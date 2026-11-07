import { getTranslations } from "next-intl/server";
import styles from "./TitleBlock.module.css";

export type SheetNumber = {
  /** Numéro de la feuille (ex. 2, ou « 02.3 » pour une sous-feuille). */
  number: number | string;
  /** Nombre total de feuilles de la navigation principale. */
  total: number;
};

type Props = {
  /** TITRE : nom de la page. */
  title: string;
  /** FEUILLE nn/NN ; null → « ?? » (page hors du jeu de plans, ex. 404). */
  sheet?: SheetNumber | null;
  /** RÉV. : date de dernière mise à jour du contenu (affichée AAAA-MM-JJ). */
  revision?: Date | string | null;
  /** ÉCH. (défaut « 1:1 »). */
  scale?: string;
  className?: string;
};

const pad = (n: number | string) => (typeof n === "number" ? String(n).padStart(2, "0") : n);

function formatRevision(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Cartouche de plan (SPEC §6) : TITRE, AUTEUR, ÉTABL., FEUILLE, RÉV., ÉCH.
 * À placer en fin de <main> de chaque page. Glisse légèrement à l'apparition
 * (changement de feuille), le numéro « monte » d'un cran.
 */
export async function TitleBlock({ title, sheet, revision, scale = "1:1", className }: Props) {
  const t = await getTranslations("ui.titleBlock");
  const rev = formatRevision(revision);
  const sheetText = sheet ? `${pad(sheet.number)}/${pad(sheet.total)}` : t("unknownSheet");

  return (
    <aside className={`${styles.block} ${className ?? ""}`} aria-label={t("label")}>
      <dl className={styles.grid}>
        <div className={`${styles.cell} ${styles.title}`}>
          <dt>{t("title")}</dt>
          <dd>{title}</dd>
        </div>
        <div className={`${styles.cell} ${styles.sheet}`}>
          <dt>{t("sheet")}</dt>
          <dd>
            <span className={styles.sheetNumber}>{sheetText}</span>
          </dd>
        </div>
        <div className={styles.cell}>
          <dt>{t("author")}</dt>
          <dd>{t("authorValue")}</dd>
        </div>
        <div className={styles.cell}>
          <dt>{t("institution")}</dt>
          <dd>{t("institutionValue")}</dd>
        </div>
        <div className={styles.cell}>
          <dt>{t("revision")}</dt>
          <dd>{rev ? <time dateTime={rev}>{rev}</time> : "—"}</dd>
        </div>
        <div className={styles.cell}>
          <dt>{t("scale")}</dt>
          <dd>{scale}</dd>
        </div>
      </dl>
    </aside>
  );
}
