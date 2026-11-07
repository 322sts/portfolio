# SPEC — Portfolio d'Alban Grelaud

Source de vérité partagée par tous les agents. En cas de doute, ce fichier gagne.
Si une décision n'est pas couverte ici, prendre le choix le plus simple et sûr, et le noter dans `DECISIONS.md` (une ligne par décision, avec l'agent qui l'a prise).

## 0. Propriétaire et contenu

- Alban Grelaud, élève-ingénieur à IMT Nord Europe. Intérêts : finance quantitative, mathématiques appliquées, IA, informatique.
- Email de contact (réception des messages) : albangrelaud@proton.me
- GitHub : https://github.com/322sts — LinkedIn : https://www.linkedin.com/in/albangrelaud/
- CV et photo : fournis plus tard par Alban via l'admin. Prévoir des états vides propres, ne rien inventer.
- **Ne jamais inventer de faits** sur Alban ou ses projets (résultats, chiffres, notes, entreprises). Ce qui manque = champ vide ou `[À REMPLIR]` visible uniquement en admin.

### Projets de départ (seed)

| slug | Titre FR / EN | Date | Équipe | Catégorie | Techno | IA | Lien |
|---|---|---|---|---|---|---|---|
| `jeu-de-nim` | Le jeu de Nim / The Game of Nim | 2024-11 | TEAM | Informatique | Python | non | https://github.com/322sts/the-game-of-nim |
| `calculateur-aire` | Calculateur d'aire de formes simples / Simple Shape Area Calculator | 2026-09 | SOLO | Informatique | C# | non | https://github.com/322sts/firstCsharp-Project |
| `portfolio` | Ce portfolio / This portfolio | 2026-11 | SOLO | Informatique | Next.js, TypeScript, PostgreSQL, Prisma | **oui** | (vide) |

Descriptions fournies par Alban :
- Nim : création en équipe d'un projet Python, le jeu de Nim, avec des assertions en test et une écriture typée, lisible et commentée.
- Aire : petite application console qui permet de choisir une forme géométrique et de calculer son aire en entrant des valeurs.
- Portfolio : site complet (auth, admin, base de données) construit avec Claude Code ; section « Méthode IA » à remplir par Alban.

Pour Nim, on peut citer le théorème de Bouton (1901) dans le corps : position perdante ⇔ XOR des tas = 0 (fait mathématique établi, pas un fait sur Alban). Ne pas affirmer que le projet l'implémente.

Catégories de départ : `finance` (Finance), `maths` (Mathématiques / Mathematics), `info` (Informatique / Computer science), `ia` (Intelligence artificielle / Artificial intelligence).

## 1. Stack

- Next.js (dernière version stable, App Router, Server Components, Server Actions), TypeScript `strict`, React 19.
- Styles : **CSS Modules + `src/styles/tokens.css`**. Pas de Tailwind, pas de librairie UI.
- Polices via `next/font/google` (auto-hébergées) : **Archivo** (axe `wdth` 62–125, graisses 400–800) et **JetBrains Mono**.
- BDD : PostgreSQL + Prisma. Dev local : **sans Docker** (utiliser `npx prisma dev` / Prisma Postgres local si dispo, sinon `embedded-postgres`). Prod : Neon (offre gratuite).
- Auth : Auth.js v5 (`next-auth@5`), stratégie **JWT** (cookie httpOnly), providers Credentials (email + mot de passe argon2 via `@node-rs/argon2`) et GitHub OAuth (optionnel si variables absentes). Adapter Prisma pour les comptes OAuth.
- i18n : `next-intl`, locales `fr` (défaut, sans préfixe) et `en` (`/en/...`), chemins traduits.
- Validation : Zod partout (formulaires, Server Actions, params d'URL).
- Markdown : `react-markdown` + `remark-gfm` + `remark-math` + `rehype-sanitize` **puis** `rehype-katex` et coloration Shiki (plugins de confiance appliqués après la sanitisation).
- Graphiques : une lib légère (uPlot ou équivalent) chargée seulement sur les pages qui en ont besoin.
- Emails : Resend. Anti-spam : Cloudflare Turnstile + champ piège. Images : Cloudinary (upload signé côté serveur).
- Hébergement : Vercel (Hobby), domaine `*.vercel.app`.

**Dégradation gracieuse en dev** : toute clé de service absente ne doit pas casser l'app.
- Resend absent → message enregistré en BDD + log console.
- Turnstile absent → utiliser les clés de test Cloudflare (toujours valides) en dev uniquement.
- Cloudinary absent → l'admin peut coller une URL d'image.
- GitHub OAuth absent → bouton masqué.

## 2. Arborescence

```
portfolio/
  prisma/schema.prisma, prisma/seed.ts
  messages/fr.json, messages/en.json
  public/
  src/
    app/
      [locale]/            layout racine public (html lang=locale)
        page.tsx           accueil
        projets/page.tsx, projets/[slug]/page.tsx
        a-propos/page.tsx, contact/page.tsx
        connexion/page.tsx, inscription/page.tsx, compte/page.tsx
        not-found.tsx
      admin/               layout racine admin séparé (FR uniquement, hors i18n)
        page.tsx, projets/…, categories/, technologies/, commentaires/, messages/, profil/
      api/auth/[...nextauth]/route.ts
      sitemap.ts, robots.ts
    components/            composants UI du design system (agent 3)
      plate/, title-block/, sheet/, calque/, dimension/, schematic/, command-palette/, …
    lib/
      db.ts                client Prisma singleton
      auth.ts              config Auth.js + helpers requireUser(), requireAdmin()
      env.ts               lecture/validation Zod des variables d'env
      i18n/                routing next-intl (pathnames), request config
      markdown/            pipeline de rendu sécurisé
      validation/          schémas Zod partagés
      security/            rate limit (table LoginAttempt), turnstile, sanitize SVG
      queries/             lectures BDD (projets publiés, filtres…)
    server/actions/        Server Actions (auth.ts, contact.ts, comments.ts, favorites.ts, admin/*.ts)
    styles/tokens.css, globals.css
    middleware.ts (ou proxy.ts selon la version de Next)
```

## 3. Routes

Publiques (FR / EN) :
- `/` | `/en`
- `/projets` | `/en/projects` — filtres en query : `cat`, `tech`, `annee`, `ia=1`, `equipe=solo|team`, `tri=date|titre`, `vue=planches|nomenclature`
- `/projets/[slug]` | `/en/projects/[slug]`
- `/a-propos` | `/en/about`
- `/contact` | `/en/contact`
- `/connexion` | `/en/login`, `/inscription` | `/en/register`, `/compte` | `/en/account`

Admin (FR, rôle ADMIN vérifié côté serveur dans le layout **et** dans chaque action) :
`/admin`, `/admin/projets`, `/admin/projets/nouveau`, `/admin/projets/[id]`, `/admin/categories`, `/admin/technologies`, `/admin/commentaires`, `/admin/messages`, `/admin/profil`.

Technique : `/api/auth/[...nextauth]`, `/sitemap.xml`, `/robots.txt`, image Open Graph.

## 4. Modèle de données (Prisma)

```
enum Role { ADMIN VISITOR }
enum ProjectStatus { DRAFT PUBLISHED }
enum TeamType { SOLO TEAM }
enum CommentStatus { PENDING APPROVED REJECTED }
enum Locale { fr en }

User { id, email @unique, passwordHash?, name?, image?, role @default(VISITOR), emailVerified?, createdAt, updatedAt,
       accounts Account[], favorites Favorite[], comments Comment[] }
Account { modèle standard Auth.js / @auth/prisma-adapter }
Project { id, slug @unique, status @default(DRAFT), date DateTime (1er du mois), teamType, aiAssisted Boolean @default(false),
          coverImageUrl?, plateSvg? (SVG sanitisé), githubUrl?, demoUrl?, pdfUrl?, featured Boolean @default(false),
          sortOrder Int @default(0), createdAt, updatedAt,
          translations ProjectTranslation[], categories ProjectCategory[], technologies ProjectTechnology[],
          media ProjectMedia[], favorites Favorite[], comments Comment[] }
ProjectTranslation { id, projectId, locale, title, summary, objectives?, body (Markdown), results?, aiMethod?  @@unique([projectId, locale]) }
Category { id, slug @unique, schematicStyle String (finance|maths|info|ia|generic), sortOrder, translations CategoryTranslation[] }
CategoryTranslation { id, categoryId, locale, name  @@unique([categoryId, locale]) }
Technology { id, slug @unique, name }
ProjectCategory { projectId, categoryId  @@id([projectId, categoryId]) }
ProjectTechnology { projectId, technologyId  @@id([projectId, technologyId]) }
ProjectMedia { id, projectId, url, altFr, altEn, captionFr?, captionEn?, sortOrder }
Favorite { userId, projectId, createdAt  @@id([userId, projectId]) }
Comment { id, projectId, userId, body (texte brut, max 2000), status @default(PENDING), createdAt }
ContactMessage { id, name, email, subject, body, read @default(false), createdAt }
LoginAttempt { id, key (email ou ip), success Boolean, createdAt  @@index([key, createdAt]) }
SiteProfile { id Int @id @default(1), bioFr, bioEn, cvUrl?, photoUrl?, githubUrl, linkedinUrl, email, updatedAt }
```
Suppressions en cascade sur les tables liées à Project et User.

## 5. Sécurité (obligatoire)

- Aucune requête SQL brute. Uniquement Prisma.
- Chaque Server Action : 1) `requireUser()`/`requireAdmin()` si nécessaire, 2) `schema.safeParse(input)`, 3) logique, 4) retour typé `{ ok: true, data } | { ok: false, error: string, fieldErrors? }`. Jamais de throw affiché à l'utilisateur avec des détails internes.
- Mots de passe : argon2id, min 10 caractères, max 128. Message d'erreur de connexion générique.
- Rate limit connexion : 5 échecs / 15 min par email et par IP (table LoginAttempt). Inscription et contact : Turnstile + champ piège + 3 envois / heure / IP.
- Commentaires : texte brut (pas de Markdown), affichés seulement si APPROVED, rendus par React (échappement natif).
- Markdown admin : sanitisé avant rendu. SVG de planche : sanitisé (DOMPurify / isomorphic-dompurify, profil SVG) à l'enregistrement **et** rendu via `<img src="data:image/svg+xml,...">` ou composant sûr.
- En-têtes : CSP (avec nonce si nécessaire), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Secrets uniquement dans `.env` (ignoré par git). `.env.example` documenté et commenté.
- Variables : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` (seed uniquement), `NEXT_PUBLIC_SITE_URL`.

## 6. Direction artistique : « Plan d'ingénieur » (base C) + apports A et B

### Tokens (`src/styles/tokens.css`)

Thème sombre = **cyanotype** (défaut si `prefers-color-scheme: dark`), thème clair = **calque**. Bascule manuelle via `data-theme` sur `<html>`, mémorisée dans un cookie (pas de flash : thème lu côté serveur).

```
Cyanotype (sombre)                 Calque (clair)
--bg        #1E3F86                --bg        #F7F9FC
--grid      #2D51A0                --grid      #DCE5F3
--ink       #F2F5FA  (trait)       --ink       #14306B
--muted     #A4C8F2  (cotes)       --muted     #4A5A7A
--mark      #F2D04B  (surlignage)  --mark      #F5DE6B (fond surligneur) / texte #6B5200
--danger    #FF9A8F                --danger    #B3261E
--ok        #8EE6B4                --ok        #1E7A46
--sheet-bg  #F7F9FC  (feuille de calque posée sur le bleu, pour les pages de lecture)
--sheet-ink #14306B
```
Pas de dégradés décoratifs, pas d'ombres floues, pas de glassmorphism, pas de border-radius (0 partout, sauf focus ring éventuel). Pas d'emojis. Icônes = petits tracés SVG au trait.

Typo : Archivo étirée (wdth 112–125, graisse 700–800, MAJUSCULES) pour les titres ; Archivo étroite (wdth 75–87, 400–500) pour le texte courant ; JetBrains Mono pour cotes, métadonnées, cartouches, code. Échelle : 12 / 14 / 16 / 18 / 22 / 28 / 40 / clamp(44px, 8vw, 104px). Texte courant ≤ 68ch, interligne 1.6.

### Éléments signature
- **Cadre + cartouche** (`TitleBlock`) sur chaque page : TITRE (nom de la page), AUTEUR A. GRELAUD, ÉTABL. IMT NORD EUROPE, FEUILLE nn/NN (numéro de page dans la navigation principale), RÉV. (date de dernière mise à jour du contenu), ÉCH. 1:1.
- **Planches** (`Plate`) pour les projets : en-tête `PL. nn · TECHNO · SOLO/ÉQUIPE`, schéma, pied avec titre et résumé, badge « ASSISTÉ PAR IA » si `aiAssisted`. Numéro = ordre chronologique (vrai ordre, pas décoratif).
- **Schémas générés** (`Schematic`) selon `schematicStyle` de la 1re catégorie, déterministes à partir du slug (seed) : finance = courbe de prix sur axes avec tirets ; maths = construction géométrique (cercle, triangle, cotes) ; info = blocs reliés (organigramme) ; ia = réseau de nœuds en couches ; generic = grille et croix de repère. Remplacé par `plateSvg` si fourni. Cotes et légendes en `--mark` apparaissent au survol / focus.
- **Cotes** (`Dimension`) : ligne fléchée avec valeur, utilisée au-dessus du nom en accueil.
- **Coordonnées curseur** en mm en haut à droite du cadre (desktop seulement, `aria-hidden`).
- **Feuille de calque** (`Sheet`) : pages de lecture (détail projet, à propos) affichent le contenu sur une feuille claire posée sur le plan (en thème sombre) ; en thème clair, c'est la page elle-même.
- **Apports A** : formules KaTeX, propositions/figures numérotées, renvois cliquables qui surlignent la cible, annotations de marge (`MarginNote`) surlignées en `--mark`.
- **Apports B** : palette de commandes `Ctrl+K` / `/` (pages, projets, changer de langue, de thème), navigation clavier complète, vue « Nomenclature » (tableau triable/filtrable) en alternative aux planches, graphiques interactifs style table traçante.
- Transitions : changement de feuille (léger glissement du cartouche, numéro qui s'incrémente). Schémas tracés trait par trait au premier affichage (stroke-dashoffset). Tout coupé sous `prefers-reduced-motion`.

### Accessibilité
Contrastes AA minimum dans les deux thèmes, focus visible (contour `--mark` 2px), lien d'évitement, landmarks, `lang` correct, navigation clavier totale, cibles tactiles ≥ 44px sur mobile, aucun débordement horizontal à 360px.

## 7. Qualité

- TypeScript strict, pas de `any`. ESLint sans erreur.
- Commentaires de code **en français**, seulement là où ils aident.
- Chaque agent termine avec `npm run lint`, `npx tsc --noEmit` et `npm run build` qui passent (signaler honnêtement si ce n'est pas le cas et pourquoi).
- Pas de commit git (le propriétaire décidera). Ne pas toucher aux fichiers d'un autre agent sans le noter dans `DECISIONS.md`.
