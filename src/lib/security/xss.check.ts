/*
 * Vérification rapide anti-XSS de renderMarkdown() et sanitizeSvg().
 * Lancer : npx tsx src/lib/security/xss.check.ts
 * (Neutralise `server-only` et les imports CSS, qui n'ont de sens que dans Next.)
 */
import Module from "node:module";
import path from "node:path";

const req = Module.createRequire(__filename);
req.cache[req.resolve("server-only")] = {
  exports: {},
} as unknown as NodeJS.Module;
req.extensions[".css"] = (m: NodeJS.Module) => {
  m.exports = {};
};

let failures = 0;
function check(label: string, condition: boolean, detail?: string): void {
  if (!condition) failures++;
  console.log(`${condition ? "OK  " : "FAIL"} ${label}${!condition && detail ? `\n     → ${detail}` : ""}`);
}

async function main(): Promise<void> {
  process.env.DATABASE_URL ??= "postgres://x";
  process.env.AUTH_SECRET ??= "x".repeat(32);
  const { renderToStaticMarkup } = await import("react-dom/server");
  // PlotterChart (client, next/dynamic) est remplacé par un témoin : on vérifie le pipeline, pas le tracé.
  const { createElement } = await import("react");
  const plotterPath = req.resolve(path.resolve(__dirname, "../../components/plotter-chart/PlotterChart.tsx"));
  req.cache[plotterPath] = {
    exports: { PlotterChart: (p: { title: string }) => createElement("div", { "data-plotter": p.title }) },
  } as unknown as NodeJS.Module;
  const { renderMarkdown } = await import("../markdown/render");
  const { sanitizeSvg } = await import("./sanitize-svg");

  const md = async (src: string) => renderToStaticMarkup(await renderMarkdown(src));

  // --- Markdown ---
  const mdPayloads: Array<[string, string]> = [
    ["<script>", "Bonjour <script>alert(1)</script> fin"],
    ["img onerror", '<img src=x onerror="alert(1)">'],
    ["lien javascript:", "[clic](javascript:alert(1))"],
    ["lien javascript: encodé", "[clic](jav&#x61;script:alert(1))"],
    ["svg onload", "<svg onload=alert(1)></svg>"],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["image javascript:", "![x](javascript:alert(1))"],
    ["KaTeX \\href", "$\\href{javascript:alert(1)}{x}$"],
  ];
  for (const [label, src] of mdPayloads) {
    const html = await md(src);
    // "javascript:" peut subsister comme TEXTE inerte (annotation KaTeX) : on vise les attributs.
    const bad = /<script|\son[a-z]+=|(href|src)="?\s*javascript:|<iframe|<svg/i.test(html);
    check(`markdown neutralise ${label}`, !bad, html);
  }

  const math = await md("Inline $a^2+b^2=c^2$ et\n\n$$\n\\sum_{i=1}^n i\n$$\n");
  check("markdown : KaTeX rendu (inline + bloc)", math.includes('class="katex"') && math.includes("katex-display"), math.slice(0, 200));
  const code = await md("```python\nprint('ok')\n```");
  check("markdown : Shiki colore le code", code.includes("shiki") && code.includes("style="), code.slice(0, 200));
  const gfm = await md("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~barré~~");
  check("markdown : GFM (tableau, barré)", gfm.includes("<table>") && gfm.includes("<del>"), gfm);
  const ext = await md("[site](https://example.com)");
  check("markdown : lien externe avec rel=noopener", ext.includes('rel="noopener noreferrer nofollow"'), ext);

  // --- Blocs ```chart (agent 4) ---
  const mdIntl = md;
  const chart = (json: string) => "```chart\n" + json + "\n```";
  const valid = await mdIntl(chart('{"title":"Courbe test","xLabel":"t","yLabel":"v","series":[{"name":"A","points":[[0,1],[1,2]]}]}'));
  check("chart valide : figure rendue (pas de bloc de code)", valid.includes("Courbe test") && !valid.includes("<pre") && !valid.includes("Graphique invalide"), valid.slice(0, 300));
  const invalid = await mdIntl(chart("{ pas du json"));
  check("chart JSON invalide : bloc d'erreur visible", invalid.includes("Graphique invalide") && invalid.includes("JSON invalide"), invalid.slice(0, 300));
  const badSchema = await mdIntl(chart('{"title":"x","series":[]}'));
  check("chart schéma invalide : bloc d'erreur visible", badSchema.includes("Graphique invalide") && badSchema.includes("series"), badSchema.slice(0, 300));
  const xssChart = await mdIntl(chart('{"title":"<img src=x onerror=alert(1)>","series":[{"name":"<script>alert(1)</script>","points":[["2024-01",1]]}]}'));
  check("chart : titres échappés", !/<img|<script/i.test(xssChart), xssChart.slice(0, 300));
  const forged = await mdIntl('<div data-chart-source=\'{"title":"forge","series":[{"name":"a","points":[[0,1]]}]}\'>x</div>');
  check("chart : marqueur impossible à forger en HTML brut", !forged.includes("forge") || !forged.includes("<figure"), forged);

  // --- SVG ---
  const svgPayloads: Array<[string, string]> = [
    ["<script>", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>'],
    ["onload", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>'],
    ["onerror/onclick", '<svg xmlns="http://www.w3.org/2000/svg"><image href="x" onerror="alert(1)"/><rect onclick="alert(1)"/></svg>'],
    ["href javascript:", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><text>x</text></a><use href="javascript:alert(1)"/></svg>'],
    ["foreignObject", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="https://evil.example"></iframe><img src=x onerror=alert(1)></foreignObject></svg>'],
    ["animate set href", '<svg xmlns="http://www.w3.org/2000/svg"><a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>'],
    ["use externe", '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#a"/></svg>'],
    ["style + url externe", '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.example)</style><rect style="fill:url(https://evil.example/x)"/></svg>'],
  ];
  for (const [label, src] of svgPayloads) {
    const out = sanitizeSvg(src);
    const bad = /<script|on[a-z]+=|javascript:|foreignObject|<iframe|<style|evil\.example/i.test(out);
    check(`svg neutralise ${label}`, !bad, out);
  }
  const good = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><circle cx="5" cy="5" r="4" fill="url(#g)" stroke="#000"/></svg>');
  check("svg légitime conservé (cercle + dégradé interne)", good.includes("<circle") && good.includes('fill="url(#g)"'), good);
  check("non-SVG rejeté", sanitizeSvg("<div>hello</div>") === "");

  console.log(failures === 0 ? "\nTous les contrôles passent." : `\n${failures} contrôle(s) en échec.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
