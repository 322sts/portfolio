# DECISIONS

Une ligne par décision non couverte (ou précisée) par SPEC.md, avec l'agent qui l'a prise.

## Base de données locale (Agent 1)

Commandes exactes (sans Docker, Prisma Postgres local via `prisma dev`) :

```
npm install            # postinstall = prisma generate
npm run db:start       # node scripts/db-start.mjs → crée puis démarre le serveur « portfolio » en arrière-plan
npm run db:migrate     # prisma migrate dev (applique prisma/migrations)
npm run db:seed        # prisma db seed → tsx prisma/seed.ts
npm run dev
npm run db:stop        # arrête le serveur local
npm run db:studio      # Prisma Studio
```

URL locale (dans `.env`) : `postgres://postgres:postgres@localhost:51218/template1?sslmode=disable`, base fantôme sur 51219. Prisma mémorise les ports du serveur nommé `portfolio` (dans `%LOCALAPPDATA%\prisma-dev-nodejs\Data\portfolio\server.json`). Sur une autre machine, le 1er `npm run db:start` affiche l'URL TCP à reporter dans `DATABASE_URL` / `SHADOW_DATABASE_URL`.

## Décisions

- [Agent 1] Versions : Next 16.4.5 (Turbopack), React 19.3, next-auth 5.0.0-beta.32 (pas de v5 stable ; peer `next ^16` OK, version épinglée sans `^`), @auth/prisma-adapter 2.11.3, next-intl 4.14.9, Prisma 7.10.1 (le tag npm `latest` de `prisma` pointait sur une 8.0.0-rc : écarté), Zod 4.6, shiki 4.6 + @shikijs/rehype.
- [Agent 1] Prisma 7 : générateur `prisma-client` → client généré dans `src/generated/prisma` (ignoré par git, régénéré par `postinstall` et `build`). Import : `@/generated/prisma/client` (types/enums : `@/generated/prisma/enums`). Driver adapter `@prisma/adapter-pg` obligatoire. Config CLI dans `prisma.config.ts` (charge `.env` via dotenv, seed déclaré dans `migrations.seed`).
- [Agent 1] Next 16 : `middleware.ts` est renommé `proxy.ts` → `src/proxy.ts` (next-intl uniquement). Matcher : exclut `admin`, `api`, `_next`, `_vercel` et tout chemin contenant un point.
- [Agent 1] i18n : `localeDetection: false` — l'URL sans préfixe est toujours en français (pas de redirection selon Accept-Language). `/fr/...` redirige vers l'URL sans préfixe. Les chemins internes sont les dossiers français (`/projets`, `/a-propos`…) ; utiliser `Link`/`redirect`/`getPathname` de `@/lib/i18n/navigation`.
- [Agent 1] Typage next-intl dans `src/global.d.ts` : `fr.json` est la référence des clés ; `en.json` doit avoir exactement les mêmes clés.
- [Agent 1] URL inconnue sous une locale : attrape-tout `src/app/[locale]/[...rest]/page.tsx` → `notFound()` → `[locale]/not-found.tsx`.
- [Agent 1] Deux layouts racine : `src/app/[locale]/layout.tsx` (public) et `src/app/admin/layout.tsx` (FR). Pas de `src/app/layout.tsx`.
- [Agent 1] Polices dans `src/styles/fonts.ts` (Archivo variable avec axe `wdth` → `--font-display` ; JetBrains Mono → `--font-mono`), classes posées sur `<html>` par les deux layouts.
- [Agent 1] `tokens.css` : thème piloté par `data-theme` sur `<html>` (`light`/`dark`), sinon `prefers-color-scheme`. Ajout de `--mark-ink` (texte surligné : #6B5200 en clair, = `--mark` en sombre) pour la double valeur de `--mark` en calque. Lecture du cookie de thème côté serveur : laissée à l'agent 3.
- [Agent 1] Schéma : modèles Auth.js `Account` (clé composite provider/providerAccountId), `Session` et `VerificationToken` ajoutés pour l'adapter, même si la stratégie est JWT (Session inutilisée). `Category.schematicStyle` a un défaut `"generic"`, `sortOrder` défaut 0. Index ajoutés : `Project(status, date)`, `Comment(projectId, status)`. `Comment.body` en `VarChar(2000)`.
- [Agent 1] `LoginAttempt.key` : convention recommandée `email:<email>` / `ip:<ip>` (à confirmer par l'agent 2).
- [Agent 1] Seed : crée ce qui manque mais n'écrase jamais un projet, le profil ou le mot de passe admin existants (pour ne pas effacer les modifs faites dans l'admin) ; libellés de catégories/technologies resynchronisés. Les 3 projets sont `PUBLISHED`, `featured=false`, catégorie `info`. `aiMethod` du portfolio laissé vide (à remplir par Alban). Hash admin : argon2id (défaut de @node-rs/argon2).
- [Agent 1] `src/lib/env.ts` : validation Zod côté serveur (`server-only`), chaînes vides = absent ; expose `features` (githubOAuth, resend, cloudinary, turnstile) et `getTurnstileKeys()` (clés de test Cloudflare hors production). Le module lève une erreur au chargement si `DATABASE_URL` ou `AUTH_SECRET` manquent.
- [Agent 1] `src/lib/auth.ts` : stubs typés (`auth()` renvoie toujours `null`). Conséquence : `/admin/*` redirige vers `/connexion` tant que l'agent 2 n'a pas implémenté l'auth (fermé par défaut). `/api/auth/[...nextauth]` renvoie 501 en attendant.
- [Agent 1] `src/lib/queries/projects.ts` : n'expose que des projets `PUBLISHED`. Numéro de planche = rang chronologique (date, puis sortOrder, puis createdAt) parmi tous les publiés, indépendant des filtres. Repli sur l'autre langue si une traduction manque (`contentLocale` l'indique). Filtres invalides ignorés (pas d'erreur) via `src/lib/validation/project-filters.ts`.
- [Agent 1] `sitemap.ts` en `force-dynamic` (pas d'accès BDD pendant `next build`) ; `robots.ts` interdit `/admin`, `/api`, `/compte`, `/en/account`.
- [Agent 1] `create-next-app` avait initialisé un dépôt git avec un commit : dossier `.git` supprimé (consigne : pas de commit). `AGENTS.md` (généré par Next 16) conservé.
- [Agent 1] Limite connue : `prisma dev` (PGlite) peut refuser de redémarrer juste après un arrêt (« Lock file is already being held ») ; `scripts/db-start.mjs` réessaie automatiquement. Si besoin : `npx prisma dev start portfolio --debug`.

## Auth & sécurité (Agent 2)

- [Agent 2] `src/lib/auth.ts` : Auth.js v5 réel, un seul fichier (pas de `auth.config.ts` : le proxy n'appelle pas `auth()`, inutile de séparer une config edge). Stratégie JWT (7 jours), `trustHost: true` (Vercel), `useSecureCookies` en prod uniquement → cookie `__Secure-authjs.session-token` httpOnly, Secure, SameSite=Lax en prod ; `authjs.session-token` httpOnly/Lax en dev. Adapter Prisma (`PrismaAdapter(db)`, compatible Prisma 7 tel quel).
- [Agent 2] Rôle : lu en BDD au moment de la connexion (callback `jwt`), jamais fourni par GitHub/le client ; nouveaux comptes = VISITOR (défaut du schéma). GitHub : `allowDangerousEmailAccountLinking: false` → un compte GitHub dont l'email = ADMIN_EMAIL est refusé (OAuthAccountNotLinked → message générique `auth.oauthError` sur /connexion), il ne peut ni devenir admin ni se greffer sur le compte admin.
- [Agent 2] `requireUser()` relit l'utilisateur en BDD à chaque appel (compte supprimé / rôle modifié pris en compte immédiatement, malgré le JWT). Non connecté → redirection vers la connexion localisée avec `callbackUrl` = page courante (lue dans l'en-tête `x-pathname` posé par le proxy). `requireAdmin()` : non connecté → connexion ; connecté non-ADMIN → `notFound()` (404, ne révèle pas l'admin). Signatures des stubs inchangées ; `auth()` renvoie toujours `AppSession | null`. Exports supplémentaires : `handlers`, `signIn`, `signOut`.
- [Agent 2] Rate limit connexion dans `authorize()` (donc aussi pour un POST direct sur `/api/auth/callback/credentials`) : 5 échecs / 15 min par `email:<email>` OU par `ip:<ip>` → la tentative suivante est refusée AVANT vérification du mot de passe (même correct) et n'est pas enregistrée. Un succès remet à zéro le compteur email, pas le compteur IP. Erreur exposée : code `rate_limited` (message `auth.tooManyAttempts`), sinon `invalid` (message générique `auth.invalidCredentials`). Utilisateur inexistant : vérification argon2 sur un hash factice (temps constant).
- [Agent 2] Clés LoginAttempt confirmées : `email:<email>`, `ip:<ip>` ; ajout de `register:<ip>` et `contact:<ip>` (quotas 3/heure/IP, une ligne par envoi ayant passé validation + Turnstile). Commentaires : 5/heure/utilisateur comptés directement dans la table Comment. Nettoyage opportuniste (≈1 appel sur 20) des lignes LoginAttempt de plus de 24 h.
- [Agent 2] IP client (`src/lib/security/ip.ts`) : 1er élément de `x-forwarded-for` (écrasé par Vercel, non usurpable là-bas), puis `x-real-ip`, sinon `unknown`. Hors Vercel, un client peut forger `x-forwarded-for` : acceptable en dev seulement.
- [Agent 2] Turnstile : `verifyTurnstile()` fermé par défaut (prod sans clés, jeton absent, réseau KO → refus). Widget client `src/lib/security/turnstile-widget.tsx` (rendu explicite, script injecté dynamiquement → autorisé par `'strict-dynamic'`, prop `resetKey` pour réinitialiser après une soumission). Champ piège `website` (`HONEYPOT_FIELD` dans `src/lib/security/form-fields.ts`) : inscription → erreur générique ; contact → faux succès silencieux.
- [Agent 2] Contrat des actions : `src/lib/validation/action-result.ts` (`ActionResult<T>`, `FormState<T>` pour `useActionState`, `ErrorKey` = clés i18n typées des namespaces errors/auth/contact/account). Les messages Zod sont des clés i18n ; le client fait `useTranslations()(state.error)`.
- [Agent 2] Actions : `auth.ts` (`login`, `register`, `loginWithGithub`, `logout`), `contact.ts` (`sendContactMessage(prev, formData)` — champs name, email, subject, body + `website` + `cf-turnstile-response`), `comments.ts` (`addComment(prev, formData)` champs projectId/body, `deleteOwnComment(id)`), `favorites.ts` (`toggleFavorite(projectId)` → `{favorited}`, `listMyFavorites()`). Les actions retournent un ActionResult : pour un `<form action>` qui attend `void`, envelopper (cf. `src/app/[locale]/compte/page.tsx`). Inscription : email déjà pris → erreur de champ `errors.emailTaken` (révèle l'existence du compte : compromis assumé, pas de vérification d'email), puis connexion automatique et redirection vers `/compte`.
- [Agent 2] Resend : expéditeur `onboarding@resend.dev` (pas de domaine vérifié sur *.vercel.app ; Resend n'autorise alors que l'envoi vers l'adresse du compte Resend), `replyTo` = visiteur, texte brut uniquement. Échec d'envoi = loggé, le message reste en BDD et l'action renvoie ok.
- [Agent 2] Anti open-redirect : `safeCallbackUrl()` (`src/lib/security/callback-url.ts`) n'accepte qu'un chemin relatif même origine (refuse `//`, antislash, caractères de contrôle, `/api/`). Auth.js revérifie aussi la même origine dans son callback `redirect` par défaut.
- [Agent 2] Markdown : `renderMarkdown(md)` (`src/lib/markdown`, Server Component, `MarkdownAsync` de react-markdown car Shiki est asynchrone). Schéma = `defaultSchema` + classes `math-inline`/`math-display` sur `<code>`. KaTeX `trust: false` (`\href{javascript:…}` rendu en erreur). Shiki `github-light`/`github-dark`, `defaultColor: "light"` (variables `--shiki-dark` exploitées par `prose.css` de l'agent 3), chargement paresseux, repli `text`. Liens externes : `rel="noopener noreferrer nofollow"`. Le CSS KaTeX est importé par `render.tsx`.
- [Agent 2] `sanitizeSvg()` dans `src/lib/security/sanitize-svg.ts` (réexporté par `@/lib/markdown`) : DOMPurify profil svg + svgFilters ; interdit script, foreignObject, style, iframe, embed, object, a ; supprime les href non internes (`#id` seulement) et les `url(...)` externes ; renvoie `""` si le résultat n'est pas un SVG. Helper `svgToDataUri()` pour `<img src>`. L'attribut `style` est conservé (exports Inkscape).
- [Agent 2] Tests XSS : `npx tsx src/lib/security/xss.check.ts` (22 contrôles : script, onerror, javascript:, svg onload, iframe, \href KaTeX, foreignObject, animate href, use externe, url() externe + rendu KaTeX/Shiki/GFM conservé). Pas de vitest ajouté.
- [Agent 2] En-têtes : CSP avec nonce par requête dans `src/proxy.ts` (pattern officiel Next ; CSP + `x-nonce` posés sur la requête avant next-intl, qui les recopie ; `/admin` passe par le proxy mais saute l'i18n). Matcher élargi : toutes les pages y compris `/admin` (exclus : api, _next, _vercel, fichiers). `script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com` (+ `'unsafe-eval'` en dev), `style-src 'self' 'unsafe-inline'`, img : self, data:, blob:, res.cloudinary.com, avatars.githubusercontent.com ; font : self, data: ; frame-src/connect-src challenges.cloudflare.com (+ ws: en dev) ; `form-action 'self' https://github.com` (redirection OAuth) ; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests` hors dev. En-têtes statiques sur toutes les routes via `next.config.ts` : X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictive, X-Frame-Options DENY, COOP same-origin, HSTS (prod uniquement), `poweredByHeader: false`.
- [Agent 2] `next.config.ts` : `isomorphic-dompurify` et `jsdom` ajoutés à `serverExternalPackages`.
- [Agent 2] Pages `connexion`, `inscription`, `compte` : fonctionnelles, style minimal dans `src/app/[locale]/connexion/auth-forms.module.css` (variables de tokens.css uniquement), composants de formulaire locaux dans `connexion/form-parts.tsx` (Field avec aria-describedby, FormAlert, Honeypot) — à remplacer par les composants de l'agent 3 lors de l'habillage (agent 4). `noindex` sur ces trois pages.

### Demandes à l'intégrateur (Agent 2)

1. **BLOQUANT pour la prod — rendre le layout public dynamique.** Avec une CSP à nonce, Next ne peut poser le nonce que sur les pages rendues à la requête. Aujourd'hui `/`, `/en`, `/a-propos`, `/contact` sont prérendues (SSG via `generateStaticParams` du layout) : vérifié avec `next start`, leurs 13 balises `<script>` n'ont pas de nonce → bloquées par `'strict-dynamic'` en prod (hydratation cassée ; en dev tout est dynamique, donc invisible). Correctif dans `src/app/[locale]/layout.tsx` (fichier de l'agent 3) : lire le cookie de thème avec `await cookies()` (prévu par la SPEC, ça suffit à rendre tout dynamique) ou `await connection()` ; et retirer `generateStaticParams` du layout, ou le garder seulement s'il ne force pas le statique. Vérifier ensuite que `npm run build` affiche `ƒ` pour toutes les routes `[locale]`.
2. Tout `<script>` inline ajouté par l'agent 3 (ex. script anti-flash de thème) ou `next/script` doit porter le nonce : `const nonce = (await headers()).get("x-nonce") ?? undefined` puis `<script nonce={nonce}>`. Sans nonce, il est bloqué.
3. Aucun `SessionProvider` nécessaire : les pages lisent la session côté serveur (`auth()`). Pour l'en-tête du site (connexion / mon compte / déconnexion), appeler `auth()` dans un Server Component et utiliser l'action `logout` de `@/server/actions/auth` dans un `<form action={logout}>`.
4. Type-check : `npm run build` échoue actuellement uniquement sur `src/components/site-header/MainNav.tsx` (href `"/projets/[slug]"` sans `params`, agent 3) ; `src/components/plate/Plate.tsx` importait aussi `@/components/badge/Badge` manquant à un instant donné. Avec le type-check désactivé temporairement, la compilation et la génération des pages passent.


## Design system (Agent 3)

### Décisions

- [Agent 3] Thème : cookie `theme` = `light|dark|system` lu côté serveur (`getThemePreference()` dans `src/components/theme/server.ts`, via `await cookies()`) → `data-theme` sur `<html>` (absent si `system` : `prefers-color-scheme` décide). Aucun script inline. `ThemeToggle` écrit le cookie (1 an, SameSite=Lax) et l'attribut sans rechargement ; un événement `portfolio:theme` garde palette et bascules synchronisées. Conséquence voulue : tout `[locale]` est dynamique (ƒ, vérifié dans `npm run build`), condition de la CSP à nonce ; `generateStaticParams` retiré du layout.
- [Agent 3] Layout `[locale]` : `SkipLink` → `Frame` (contient `SiteHeader`, `<div class="page">{children}</div>`, `SiteFooter`) → `CommandPalette` hors cadre. Les pages gardent `<main id="contenu">` (cible du lien d'évitement) ; `.page > main` reçoit une marge par défaut (gouttière) dans `globals.css`. Le layout appelle `auth()` (lien Connexion, ou Mon compte + `<form action={logout}>`) et `getPublishedProjects()` pour la palette (erreur BDD → palette sans projets, la page reste servie). `data-scroll-behavior="smooth"` posé sur `<html>` (exigé par Next 16 avec `scroll-behavior: smooth`).
- [Agent 3] Cartouche : le layout ne connaît pas la page courante → **chaque page rend `<TitleBlock>` elle-même, en fin de `<main>`** (titre, feuille, révision issues de ses données). Numéros de feuille : `MAIN_SHEETS` / `sheetFor("projects")` dans `src/components/site-header/nav-items.ts` (01 Accueil, 02 Projets, 03 À propos, 04 Contact). Proposition : détail projet = `{ number: "02." + plateNumber, total: 4 }` ; pages hors séquence (connexion, 404…) = `sheet={null}` → « ?? ».
- [Agent 3] Focus : `--focus` = `--mark` (#F2D04B) en sombre, mais `#6B5200` (la valeur « texte » de --mark) en clair : le jaune #F5DE6B sur #F7F9FC n'atteint que 1,3:1, invisible. Contour 2 px, décalage 2 px.
- [Agent 3] Nouveaux jetons : `--grid-major` (couleur de la trame 100 px), `--on-mark` (texte posé sur --mark), `--surface` / `--surface-2` (champs, survols), `--rule` (filets décoratifs, jamais seuls porteurs de sens), `--focus`, `--backdrop`, `--plot-1..4` ; pas de trame `--grid-step` (20 px) / `--grid-step-major` (100 px) ; échelles `--fs-*`, `--wdth-*`, `--space-*`, `--stroke-*`, `--dur-*`, `--tap` (44 px). `[data-surface="light"]` / `[data-surface="dark"]` re-déclarent une palette sur un sous-arbre (feuille de calque, comparaison de thèmes).
- [Agent 3] Fond quadrillé : 4 `linear-gradient` à arrêts nets de 1 px (ce sont des traits, pas un dégradé décoratif) ; aucun autre dégradé, aucune ombre floue, `border-radius: 0` global. Seule « ombre » : un filet net `inset 0 -2px 0` sous le champ de la palette.
- [Agent 3] Sheet : en sombre, feuille claire quadrillée posée sur le bleu, équerres aux coins ; en clair, transparente (la page est la feuille). À l'intérieur, palette calque via `data-surface="light"` (le code Shiki y reste en couleurs claires même en thème sombre).
- [Agent 3] Shiki : `prose.css` gère `defaultColor: "light"` (choix de l'agent 2 : bascule sur `--shiki-dark` en surface sombre, `!important` nécessaire car couleurs inline) et `defaultColor: "light-dark()"` (suivrait `color-scheme`). Fond des `<pre>` forcé à `--surface`.
- [Agent 3] KaTeX : CSS importée par `<Prose>` (et aussi par `render.tsx` de l'agent 2 : doublon sans effet, Next déduplique).
- [Agent 3] Schémas : SVG générés côté serveur (0 JS), déterministes (FNV-1a + mulberry32 sur `style:slug`), `viewBox 400×250`. Tracé par `pathLength=1` + `stroke-dashoffset` en CSS, par étapes (aucun style inline). Cotes dans `<g data-dim>` en `--mark-ink`, opacité pilotée par la variable héritée `--dim-opacity` (posée par `Plate` au survol / focus, ou `showDimensions`). Schémas dédiés : `jeu-de-nim` (tas 3/4/5, binaire, 3 ⊕ 4 ⊕ 5 = 2 — fait mathématique, rien n'est affirmé sur le projet), `calculateur-aire` (cercle/triangle/rectangle cotés, πr², bh/2, l × L). Étiquettes neutres (A1, B2, x1, ŷ…) : aucun fait inventé. `plateSvg` : rendu via `<img src="data:…">` (`svgToDataUrl`, `img-src data:` autorisé par la CSP de l'agent 2) ; la sanitisation reste du ressort de `sanitizeSvg()`.
- [Agent 3] Planches : numéro = `plateNumber` (chronologique, agent 1), lien étiré sur le titre (une seule tabulation par planche), survol/focus = en-tête inversé + cotes révélées + contour `--focus` via `:has()`. `PlateGrid` : trame 12 colonnes, 1re planche 7 col. × 2 rangs, puis rangs alternés 5/7 – 7/5 ; une colonne sous 720 px. La 1re planche est la 1re du tableau reçu (l'appelant décide : la plus récente, ou `featured`).
- [Agent 3] En-tête : tout en ligne à partir de 1200 px, menu repliable en dessous (un seul arbre DOM, `aria-expanded`, Échap, clic extérieur, fermeture au changement de page). LocaleSwitch = vrai lien (sans JS) vers la même page dans l'autre langue, params et query conservés ; vers le français, next-intl produit `/fr/...` qui redirige vers l'URL sans préfixe (comportement standard de next-intl).
- [Agent 3] Palette : `<dialog>` natif `showModal()` (inert hors dialogue = focus piégé, Échap natif), combobox + listbox + `aria-activedescendant`, groupes Feuilles / Planches / Actions ordonnés selon leur meilleur résultat, recherche floue maison (sous-chaîne puis sous-séquence, sans accents). Raccourcis : Ctrl+K, Cmd+K, « / » (sauf dans un champ). Testé (CDP) : ouverture, recherche, Entrée → thème et changement de langue.
- [Agent 3] FilterBar : `<form method="get">` (marche sans JS, bouton « Appliquer » visible tant que la page n'est pas hydratée), puis mise à jour immédiate de l'URL (`router.replace`, `scroll: false`) à chaque changement ; écrit exactement les clés de `project-filters.ts` en omettant les valeurs par défaut (`filtersToQuery`).
- [Agent 3] Nomenclature : tri client (toutes colonnes, `aria-sort`), ↑/↓/Début/Fin entre les liens des lignes, région défilante focusable (tableau min. 760 px, la page ne déborde jamais).
- [Agent 3] PlotterChart : SVG maison (pas d'uPlot : quelques ko, couleurs = jetons CSS, pas de canvas), chargé par `next/dynamic` (`ssr: false`) seulement là où il est utilisé. Curseur + infobulle souris ET clavier (←/→/Début/Fin/Échap), annonce `aria-live`, légende dès 2 séries, tableau de données dépliable. Le validateur de palette (skill dataviz) échoue pour 3–4 séries : la DA n'offre que deux teintes libres. L'identité est donc portée par le motif de plume (plein, tirets, pointillés, mixte) + légende + tableau ; `--ok` / `--danger` ne sont jamais des couleurs de série. Recommandation : ≤ 2 séries par graphique.
- [Agent 3] Admin : `AdminShell` (mode « atelier » : fond uni sans trame, densité forte, navigation latérale codée A0–A6), libellés FR en dur (admin hors i18n) ; `requireAdmin()` conservé en tête du layout. Primitives de formulaire sans i18n ni hook → utilisables en admin et en Client Components.
- [Agent 3] `/design` (et `/en/design`) : vitrine de tous les composants avec les vrais projets ; `notFound()` si `NODE_ENV === "production"`, `noindex`.
- [Agent 3] Messages : clés ajoutées dans `nav` (sheet, menu, menuOpen, menuClose, homeLink, currentLocale, switchLocaleLabel), `footer` (links, drawingSet, sheets, scale, design), `common` (open, apply, reset, none, required, optional) et nouvelle section `ui` (theme, titleBlock, plate, plates, nomenclature, view, filters, palette, chart, marginNote, figure, crossRef, emptyDefault). fr/en synchronisés (224 clés chacun).

### Contrastes (WCAG 2.x, calculés)

| Paire | Ratio | Niveau |
|---|---:|---|
| Calque `--ink` #14306B / `--bg` #F7F9FC | 11,96 | AAA |
| Calque `--muted` #4A5A7A / `--bg` | 6,56 | AA |
| Calque `--mark-ink` #6B5200 / `--bg` (texte, focus) | 7,03 | AAA |
| Calque `--ink` / `--mark` #F5DE6B (texte surligné) | 9,34 | AAA |
| Calque `--danger` #B3261E / `--bg` | 6,20 | AA |
| Calque `--ok` #1E7A46 / `--bg` | 5,07 | AA |
| Calque `--ink` / `--surface` #FFFFFF | 12,61 | AAA |
| Calque `--muted` / `--surface-2` #EEF2F9 | 6,16 | AA |
| Calque `--muted` / trame forte #C3D2EA (pire cas : texte sur un trait) | 4,52 | AA |
| Cyanotype `--ink` #F2F5FA / `--bg` #1E3F86 | 9,11 | AAA |
| Cyanotype `--muted` #A4C8F2 / `--bg` | 5,74 | AA |
| Cyanotype `--mark` #F2D04B / `--bg` (texte, focus) | 6,59 | AA |
| Cyanotype `--on-mark` #14306B / `--mark` | 8,35 | AAA |
| Cyanotype `--danger` #FF9A8F / `--bg` | 4,87 | AA |
| Cyanotype `--ok` #8EE6B4 / `--bg` | 6,69 | AA |
| Cyanotype `--ink` / `--surface` #183573 | 10,70 | AAA |
| Cyanotype `--muted` / `--surface-2` #234894 | 5,00 | AA |
| Cyanotype `--muted` / trame forte #3A62B5 (pire cas : texte sur un trait 1 px) | 3,37 | limité à 1 px, accepté |
| Feuille `--sheet-ink` #14306B / `--sheet-bg` #F7F9FC | 11,96 | AAA |
| Bordures de champs (`--muted`) / fond | 5,74 – 6,56 | ≥ 3:1 (composants) |
| `--rule` (#9FB2D3 clair : 2,04 ; #5A7FC6 sombre : 2,50) | — | décoratif uniquement |

### API des composants (une ligne chacun)

Server Components sauf mention « client ». Imports `@/components/<dossier>/<Fichier>`.

- `Frame({ children, coords? = true, className? })` : cadre de page à double filet, zones 1–8/A–F, coordonnées curseur (desktop, monté via `CursorCoords`, client).
- `TitleBlock({ title, sheet?: { number: number | string; total: number } | null, revision?: Date | string | null, scale? = "1:1", className? })` : cartouche ; `sheet=null` → « ?? ». Helpers `MAIN_SHEETS`, `SHEET_TOTAL`, `sheetFor(key)` dans `site-header/nav-items.ts`.
- `SiteHeader({ theme: ThemePreference, user: { name: string | null } | null })` ; `SiteFooter({ profile?: { githubUrl, linkedinUrl, email } })` (défaut : SPEC §0 ; passer le `SiteProfile` si disponible) ; `SkipLink({ label, targetId? = "contenu" })`.
- `ThemeToggle({ initial, labels: { legend, system, light, dark, short: { system, light, dark } }, className? })` (client) ; `applyTheme(pref)` (`theme/client.ts`) ; `getThemePreference()` (`theme/server.ts`).
- `Plate({ project: PlateProject, size?: "feature" | "standard", headingLevel?: 2 | 3, className? })` : `PlateProject` = Pick de `ProjectListItem` ; helpers `formatPlateDate(date)` (« MM.AAAA »), `plateNumberLabel(n)`.
- `PlateGrid({ projects: PlateProject[], headingLevel? = 3, label?, className? })`.
- `Schematic({ style: SchematicStyle, seed: string, customSvgDataUrl?: string | null, title?, showDimensions? = false, animate? = true, className? })` ; `svgToDataUrl(sanitizedSvg)` (`schematic/svg-data-url.ts`).
- `Dimension({ value: ReactNode, orientation?: "horizontal" | "vertical", tone?: "ink" | "mark", decorative?, className? })`.
- `Sheet({ children, as?: "article" | "div" | "section", withMargin?, stamp?, id?, "aria-labelledby"?, className? })`.
- `MarginNote({ children, label?, id?, ariaLabel?, className? })` : à placer juste avant le paragraphe annoté, dans une `Sheet withMargin`.
- `CrossRef({ target: string, children, className? })` : la cible doit porter `data-xref` (automatique pour `Figure` et `MarginNote` avec id).
- `Figure({ id, number, caption, children, className? })`.
- `Prose({ children, as?, className? })` : enveloppe le résultat de `renderMarkdown()` (classe `.prose`, CSS KaTeX).
- `Nomenclature({ projects, className? })` (projets au format `ProjectListItem`) → `NomenclatureTable` (client).
- `ViewSwitch({ filters: ProjectFilters, className? })` ; `filtersToQuery(filters)` (`filter-bar/query.ts`).
- `FilterBar({ options: FilterOptions, filters: ProjectFilters, resultCount?, className? })` (client).
- `CommandPalette({ projects: { slug, title, plateNumber, hint? }[], isAuthenticated })` (client, déjà monté dans le layout) ; `openCommandPalette()` (`command-palette/events.ts`) pour l'ouvrir depuis n'importe quel bouton.
- Formulaires (`@/components/form`) : `Button({ variant?: "primary" | "secondary" | "danger" | "ghost", size?: "sm" | "md", loading?, ...button })` (**type="button" par défaut**) ; `buttonClassName({ variant, size, className })` pour styler un `<Link>` ; `Field({ id, label, hint?, error?, required?, children })` + `fieldA11y(id, { hint, error })` ; `TextInput({ id, label, hint?, error?, ...input })` ; `TextArea({ id, label, hint?, error?, mono?, rows?, ...textarea })` ; `Select({ id, label, options: { value, label, disabled? }[], placeholder?, hint?, error?, ...select })` ; `Checkbox({ id, label, hint?, error?, ...input })`. Ids : `${id}-aide`, `${id}-erreur`.
- `Badge({ children, tone?: "neutral" | "mark" | "ok" | "danger" })` ; `Notice({ tone: "success" | "error" | "info", title?, children, id? })` (role status / alert) ; `EmptyState({ title, children?, action? })`.
- `PlotterChart({ series: { id, label, points: { x: string | number; y: number }[] }[], title, unit?, decimals? = 2, xType?: "time" | "number", height?: 220 | 280 | 360, className? })` (client, chargé dynamiquement).
- `AdminShell({ children, user: { email, name }, theme })` (déjà monté dans `src/app/admin/layout.tsx`).
- `Icon({ name, size? = 16, label?, className? })` : icônes au trait (menu, close, search, arrowRight, arrowLeft, arrowUpRight, check, alert, sort, sortAsc, sortDesc, plus, external, grid, table, crosshair).

### Demandes / points ouverts (Agent 3)

1. Agent 4 : chaque page publique rend `<TitleBlock>` en fin de `<main id="contenu">` ; `Sheet` + `Prose` pour le détail projet et « à propos » ; `PlateGrid` / `Nomenclature` / `FilterBar` / `ViewSwitch` sur `/projets` ; `Dimension` au-dessus du nom en accueil.
2. Agents 2/4 : remplacer les composants locaux de `connexion/form-parts.tsx` par `@/components/form` (`TextInput`, `Notice`, `Button`).
3. Base locale `prisma dev` (PGlite) : en dev, des « Server has closed the connection » (P1017) apparaissent par intermittence sur `getProjectBySlug` quand plusieurs requêtes BDD partent en parallèle (le layout en ajoute une pour la palette). Sans objet a priori sur Neon ; à surveiller.
4. `AdminShell` n'a pas été vérifié visuellement (il faut une session ADMIN) : seulement type-check, lint et build.

## Pages publiques (Agent 4)

- [Agent 4] Fichiers : pages `src/app/[locale]/**` (hors `design/`), dossiers privés `_lib/` (`seo.ts` : `pageMetadata()` = title, description, canonical, hreflang fr/en/x-default, Open Graph + Twitter ; `images.ts` : `isOptimizableImage()`) et `_components/form-helpers.tsx` (`fieldError`, `useErrorText`, `FormAlert` → `Notice`, `Honeypot`). Nouvelles lectures dans `src/lib/queries/site.ts` : `getPublicProfile(locale)` (repli SPEC §0 si pas de profil, bio dans l'autre langue si vide), `getDomainCounts(locale)` (toutes les catégories, y compris à 0), `getApprovedComments(projectId)` (nom de l'auteur seulement, jamais l'email), `isFavorite(userId, projectId)`.
- [Agent 4] Requêtes BDD **séquentielles** dans les pages (pas de `Promise.all` sur Prisma) : la base locale n'accepte qu'une connexion.
- [Agent 4] Image OG : `src/app/[locale]/opengraph-image.tsx` (cyanotype, trame, cote, cartouche ; police par défaut de `next/og`, pas d'Archivo). Next ne propage pas l'image de fichier quand une page définit son propre `openGraph` : `pageMetadata()` pose donc explicitement `/opengraph-image` (fr) ou `/en/opengraph-image`.
- [Agent 4] `/projets` filtré : `noindex, follow` (canonical = liste complète). Le compteur de résultats est celui de `FilterBar` (role=status). Filtre sans résultat (ex. `?cat=finance`) → `EmptyState` + lien « Réinitialiser les filtres » (la vue est conservée).
- [Agent 4] Détail projet : cartouche `FEUILLE 02.nn/04`. Énoncé = `summary` ; Objectifs, Résultats, Méthode IA (seulement si `aiAssisted` ET `aiMethod` non vide) passent tous par `renderMarkdown` (contenu admin). Repli de langue : `Notice` info « Traduction indisponible… » + `lang` posé sur le titre et la feuille. Couverture (`coverImageUrl`) affichée en Fig. 1 des médias si présente. Favori : `FavoriteButton` (client, `aria-pressed`) ; non connecté → lien `/connexion?callbackUrl=<page>`. Commentaires : formulaire `useActionState(addComment)`, brouillon conservé en cas d'erreur, `Notice` « visible après modération » au succès.
- [Agent 4] `next.config.ts` (fichier agent 2) : ajout de `images.remotePatterns` pour `https://res.cloudinary.com/**`. Toute autre URL d'image (collée à la main) est rendue avec `unoptimized` au lieu de faire planter la page ; la CSP `img-src` reste le filtre final (une image hors Cloudinary ne s'affichera pas en prod).
- [Agent 4] Accueil : cote au-dessus du nom = vraie étendue du jeu de plans (« PL. 01 → PL. nn · années min–max » des projets publiés). Relevé des domaines = tableau (catégories de la base, vrai nombre de projets publiés ; 0 → « en préparation », sans lien). Les 3 planches les plus récentes.
- [Agent 4] À propos : bio rendue en Markdown sécurisé ; formation = « Élève-ingénieur, IMT Nord Europe » (rien d'autre, aucune date inventée) ; CV et photo seulement si renseignés.
- [Agent 4] Connexion / inscription / compte : `connexion/form-parts.tsx` et `auth-forms.module.css` supprimés, remplacés par `@/components/form` (`TextInput`, `Button type="submit"`), `Notice`, `Badge`, `EmptyState` et `connexion/auth.module.css`. Logique, actions, ids des champs, champ piège et Turnstile inchangés. Cartouche `FEUILLE ??`.
- [Agent 4] 404 localisée « Feuille introuvable » (case barrée, cartouche `??`) ; titre en `clamp()` pour tenir à 360 px.
- [Agent 4] `src/lib/security/xss.check.ts` (fichier agent 2) : 5 contrôles ajoutés pour les blocs `chart` (rendu, JSON invalide, schéma invalide, échappement des titres, marqueur non forgeable). `PlotterChart` y est remplacé par un témoin (composant client + `next/dynamic`). 27 contrôles OK.
- [Agent 4] Messages : clés ajoutées dans `home`, `projects`, `about`, `contact`, `account`, `auth.accountSheet`, `errors.notFound*`, `ui.chart.invalid*/axis*` ; fr/en synchronisés (306 clés chacun).

### Syntaxe des graphiques dans le Markdown (pour l'admin)

Un bloc de code de langage `chart` contenant du JSON :

````
```chart
{
  "title": "Prix simulé",
  "xLabel": "Date",
  "yLabel": "Prix",
  "unit": "€",
  "decimals": 2,
  "series": [
    { "name": "Série A", "points": [["2024-01-01", 100], ["2024-02-01", 102.5]] },
    { "name": "Série B", "points": [["2024-01-01", 98], ["2024-02-01", 99.1]] }
  ]
}
```
````

- Obligatoires : `title` (≤ 200 car.), `series` (1 à 4 séries, recommandé ≤ 2), chaque série `name` (≤ 80) + `points` (1 à 2000 couples `[x, y]`).
- Facultatifs : `xLabel`, `yLabel` (≤ 80, affichés dans la légende de la figure), `unit` (≤ 16, suffixe des valeurs y), `decimals` (0–6, défaut 2).
- `x` = nombre OU date ISO (`AAAA-MM`, `AAAA-MM-JJ`, `AAAA-MM-JJTHH:MM…`), le même type pour tous les points ; `y` = nombre fini.
- JSON ou schéma invalide → encadré « Graphique invalide » avec le chemin et la cause (ex. `series.0.points.3.1 : …`), la page ne plante pas.
- Implémentation : `src/lib/markdown/chart.tsx` (plugin rehype placé après `rehype-sanitize`, avant Shiki ; `renderMarkdown(md, { locale })` pour la langue des messages d'erreur).

### Points ouverts (Agent 4)

1. Un projet de test « Projet test A5 » (agent 5 ?) est publié en base locale : il apparaît sur l'accueil et `/projets`. À supprimer avant la mise en ligne.
2. Favoris et commentaires testés seulement en non connecté (lien de connexion) et par type-check ; le parcours connecté n'a pas été joué en navigateur.

## Administration (Agent 5)

- [Agent 5] Contrat des actions admin : `AdminResult<T>` (`src/lib/admin/result.ts`) = `{ ok: true, data } | { ok: false, error, fieldErrors? }`, mais `error` / `fieldErrors` contiennent directement du **texte français** (admin hors i18n), pas des clés i18n comme `ActionResult`. Clés de `fieldErrors` = chemin Zod pointé (`fr.title`, `media.2.altEn`). Chaque action : `requireAdmin()` → `safeParse` → Prisma → `revalidate*()` ; erreurs inattendues loggées, message générique côté client.
- [Agent 5] Actions dans `src/server/actions/admin/` : `projects.ts` (saveProject, setProjectStatus, setProjectFeatured, moveProject, deleteProject, sanitizePlateSvg, previewMarkdown), `taxonomy.ts` (save/delete Category & Technology, quickCreateTechnology), `moderation.ts` (setCommentStatus, deleteComment, setMessageRead, deleteMessage), `profile.ts` (saveProfile), `uploads.ts` (getUploadSignature). Le formulaire projet envoie un objet JSON (pas de FormData) : il faut JS pour l'admin (uploads, médias ordonnés).
- [Agent 5] Revalidation (`src/lib/admin/revalidate.ts`) par motifs de routes internes (`/[locale]`, `/[locale]/projets`, `/[locale]/projets/[slug]`, layout `/[locale]` pour la palette, `/sitemap.xml`, layout `/admin`) : couvre FR et EN, liste et détail, quel que soit le slug.
- [Agent 5] Traduction EN facultative : si tous les champs EN sont vides, AUCUNE ligne EN n'est enregistrée (le public se replie sur FR, cf. agent 1) et l'admin affiche un avertissement ; si un champ EN est rempli, titre + résumé EN deviennent obligatoires. FR : titre + résumé obligatoires, corps peut être vide.
- [Agent 5] Nouveau projet : brouillon par défaut, `sortOrder = min − 1` (en tête). `moveProject` échange le `sortOrder` des deux voisins ; renumérote 1..n seulement s'ils sont égaux. Ordre admin = `sortOrder` asc puis date desc. Rappel : côté public, `sortOrder` ne départage que les projets d'un même mois (numéro de planche, agent 1).
- [Agent 5] Suppression catégorie / techno utilisée : refusée par le serveur sauf `detach: true` ; l'UI propose « Détacher N projet(s) et supprimer ». Confirmations de suppression dans la page (`ConfirmAction`, Échap annule, focus rendu), jamais `confirm()`.
- [Agent 5] SVG de planche : lu côté navigateur, assaini par l'action `sanitizePlateSvg` pour l'aperçu (`<img src="data:">`), puis **réassaini** par `saveProject` avant écriture. SVG vide après nettoyage → erreur de champ.
- [Agent 5] Aperçu Markdown : Server Action `previewMarkdown` qui renvoie le rendu React de `renderMarkdown` (même pipeline que le public, donc blocs ```chart de l'agent 4 compris). Aide de syntaxe repliable sous le corps (KaTeX, code, tableaux, `chart`). Page `/admin/projets/[id]/apercu` (`?langue=en`) : planche + feuille de lecture avec les composants partagés, même en brouillon ; la mise en page exacte de la page publique reste celle de l'agent 4.
- [Agent 5] `src/app/admin/layout.tsx` : ajout d'un `NextIntlClientProvider` (FR) autour des pages, en gardant `requireAdmin()` + `AdminShell` : `Plate` et les composants clients éventuels du Markdown (graphiques) lisent leurs libellés via next-intl. L'aperçu appelle `setRequestLocale(locale)` et ré-enveloppe dans son propre fournisseur.
- [Agent 5] Messages : ouvrir un message (`/admin/messages?id=…`, liens `prefetch={false}`) le marque lu dans le rendu serveur ; email de l'expéditeur affiché en texte (`<code>`), sans lien mailto.
- [Agent 5] Cloudinary (`src/lib/cloudinary/`) : `kinds.ts` (projectImage → `portfolio/projets`, image jpg/png/webp 5 Mo ; profilePhoto → `portfolio/profil`, 3 Mo ; cv → `portfolio/cv`, **raw**, PDF 5 Mo), `server.ts` (signature SHA-1 maison identique à `cloudinary.utils.api_sign_request`, dossier + `allowed_formats` signés ; `isOwnCloudinaryUrl` vérifie https + `res.cloudinary.com/<cloud name>/<image|raw>/upload/(vN/)?<dossier>/…<ext>`), `client.ts` (upload direct navigateur → `api.cloudinary.com`). Contrôle hors-ligne : `npx tsx --conditions=react-server src/lib/cloudinary/cloudinary.check.ts` (14 contrôles OK). Limite : la taille max n'est vérifiée que dans le navigateur (le serveur ne revérifie que l'URL).
- [Agent 5] Validation des URL de fichiers : Cloudinary configuré → images = uniquement NOTRE compte/dossier (ou chemin local `/…`) ; CV = toute URL https (simple lien). Cloudinary absent → toute URL https ou chemin local, avec la mention « Cloudinary non configuré ». NB : la CSP (`img-src` : self, data:, blob:, res.cloudinary.com) bloque les images d'autres domaines ; non élargie.
- [Agent 5] **CSP modifiée** (`src/proxy.ts`, fichier de l'agent 2) : `connect-src` + `https://api.cloudinary.com` (upload signé direct).
- [Agent 5] `.env` local : variables Cloudinary présentes mais VIDES → mode « URL à coller » actif ; upload réel non testé de bout en bout (signature et validation testées hors-ligne).
- [Agent 5] Test réel : `prisma dev` (PGlite) n'accepte qu'une connexion → impossible de lancer `next start` (ou un script Prisma) en parallèle du serveur dev. Lancer `npm run build` pendant que `next dev` tourne dans le même dossier a laissé le serveur dev dans un état cassé (« Jest worker encountered 2 child process exceptions » → 500 sur certaines routes) : **redémarrer `npm run dev` après chaque build**.
