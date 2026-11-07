import "katex/dist/katex.min.css";
import "@/styles/prose.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Élément racine (défaut div). */
  as?: "div" | "section" | "article";
};

/**
 * Conteneur du Markdown rendu (classe globale .prose) : charge la CSS de KaTeX
 * et les styles de contenu uniquement sur les pages qui l'utilisent.
 */
export function Prose({ children, className, as: Tag = "div" }: Props) {
  return <Tag className={`prose ${className ?? ""}`}>{children}</Tag>;
}
