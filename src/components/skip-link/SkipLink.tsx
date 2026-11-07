import styles from "./SkipLink.module.css";

type Props = {
  /** id de la cible (défaut « contenu », l'id des <main> des pages). */
  targetId?: string;
  label: string;
};

/** Lien d'évitement : premier élément focusable de la page, visible au focus. */
export function SkipLink({ targetId = "contenu", label }: Props) {
  return (
    <a href={`#${targetId}`} className={styles.skip}>
      {label}
    </a>
  );
}
