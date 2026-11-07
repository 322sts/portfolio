import "server-only";
import "katex/dist/katex.min.css";
import rehypeShiki from "@shikijs/rehype";
import type { ReactElement } from "react";
import { MarkdownAsync, type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import { CHART_PROP, ChartBlock, rehypeChartBlocks } from "./chart";

/**
 * Rendu Markdown sécurisé (SPEC §1 et §5), côté serveur uniquement.
 * Ordre : remark-gfm + remark-math → rehype-sanitize (le contenu de l'admin est
 * traité comme non fiable) → PUIS plugins de confiance rehype-katex et Shiki,
 * qui génèrent eux-mêmes leur HTML à partir du texte déjà assaini.
 * Le HTML brut du Markdown n'est jamais interprété (pas de rehype-raw).
 */

const codeClassNames = defaultSchema.attributes?.code ?? [];

/** Schéma par défaut (GitHub) + classes dont rehype-katex a besoin en entrée. */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...codeClassNames, ["className", /^language-./, "math-inline", "math-display"]],
  },
};

const rehypePlugins: PluggableList = [
  [rehypeSanitize, markdownSanitizeSchema],
  // Blocs ```chart (agent 4) : après la sanitisation, avant Shiki. Voir ./chart.tsx.
  rehypeChartBlocks,
  [rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }],
  [
    rehypeShiki,
    {
      // Thème sobre ; variables --shiki-dark disponibles pour le thème cyanotype.
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: "light",
      lazy: true,
      langs: ["python", "csharp", "typescript", "javascript", "tsx", "bash", "json", "sql", "c", "cpp", "java", "rust", "r", "latex"],
      fallbackLanguage: "text",
    },
  ],
];

type RenderOptions = {
  /** Langue des messages générés (erreurs de graphique). Défaut : fr. */
  locale?: "fr" | "en";
};

function buildComponents(locale: "fr" | "en"): Components {
  return {
    // Liens externes : pas de fuite du référent ni d'accès à window.opener.
    a: ({ node, href, children, ...rest }) => {
      void node; // nœud hast fourni par react-markdown, inutile ici
      const external = typeof href === "string" && /^https?:\/\//i.test(href);
      return (
        <a href={href} {...rest} {...(external ? { rel: "noopener noreferrer nofollow" } : {})}>
          {children}
        </a>
      );
    },
    // Marqueur posé par rehypeChartBlocks (le Markdown ne peut pas le produire lui-même).
    div: ({ node, children, ...rest }) => {
      const source = node?.properties?.[CHART_PROP];
      if (typeof source === "string") return <ChartBlock source={source} locale={locale} />;
      return <div {...rest}>{children}</div>;
    },
  };
}

/** Rend du Markdown (texte de l'admin) en éléments React assainis. */
export async function renderMarkdown(md: string, options: RenderOptions = {}): Promise<ReactElement> {
  return MarkdownAsync({
    children: md,
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins,
    components: buildComponents(options.locale ?? "fr"),
  });
}
