import styles from "./Badge.module.css";

type Props = {
  children: React.ReactNode;
  /** neutral : filet ; mark : surligné (ex. ASSISTÉ PAR IA) ; ok / danger : états. */
  tone?: "neutral" | "mark" | "ok" | "danger";
  className?: string;
};

/** Étiquette mono en capitales, cadre fin. Le sens n'est jamais porté par la couleur seule. */
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span className={`${styles.badge} ${className ?? ""}`} data-tone={tone}>
      {children}
    </span>
  );
}
