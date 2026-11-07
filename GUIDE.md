# Guide d'installation et de déploiement

Pour : Alban (niveau intermédiaire, à l'aise avec Git et GitHub, jamais utilisé Node.js).
Système : Windows 11, PowerShell. Coût total : 0 €.

---

## 0. Node.js en 2 minutes

- **Node.js** exécute du JavaScript sur ton ordinateur (et sur les serveurs), hors du navigateur. Next.js, le framework du site, tourne dessus. Il est déjà installé chez toi (`node -v` → v24).
- **npm** est le gestionnaire de paquets de Node, l'équivalent de `pip` en Python.
  - `package.json` liste les dépendances et les **scripts** du projet (comme un Makefile).
  - `npm install` télécharge les dépendances dans `node_modules/` (ne jamais le versionner).
  - `npm run <nom>` lance un script de `package.json`, par exemple `npm run dev`.
- **npx** lance un outil installé dans le projet sans l'installer globalement (`npx prisma studio`).

Les scripts utiles :

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance le site en développement sur http://localhost:3000 (rechargement automatique) |
| `npm run build` puis `npm start` | Construit et lance la version de production en local |
| `npm run lint` / `npm run typecheck` | Vérifie le style du code / les types TypeScript |
| `npm run db:start` / `npm run db:stop` | Démarre / arrête la base PostgreSQL locale |
| `npm run db:migrate` | Applique les changements du schéma de base (dev) |
| `npm run db:seed` | Remplit la base (catégories, tes 3 projets, compte admin) |
| `npm run db:studio` | Ouvre une interface web pour voir et modifier la base |

---

## 1. Travailler en local

### Première fois
```powershell
cd "C:\Users\banba\Desktop\DEV\VIBE CODE\portfolio"
npm install
npm run db:start      # affiche « Base locale « portfolio » démarrée »
npm run db:migrate
npm run db:seed
npm run dev
```
Ouvre http://localhost:3000. L'admin est sur http://localhost:3000/admin.
Identifiants de dev : `albangrelaud@proton.me` et le mot de passe `ADMIN_INITIAL_PASSWORD` du fichier `.env`.

### Les fois suivantes
```powershell
npm run db:start
npm run dev
```
`Ctrl+C` arrête le serveur. `npm run db:stop` arrête la base.

### Si la base ne répond plus
Message typique : `Server has closed the connection` (P1017). La base locale n'accepte qu'une connexion : un ancien serveur la monopolise sans doute.
1. Ferme tous les terminaux où tourne `npm run dev` ou `npm start`.
2. `npm run db:stop`, puis `npm run db:start` (le script réessaie tout seul, c'est normal de voir « Tentative 1 échouée »).

Ce problème n'existe qu'en local : en production, Neon accepte plusieurs connexions.

---

## 2. Mettre le code sur GitHub

Le dossier n'est pas encore un dépôt Git. Le fichier `.env` (tes secrets) est déjà ignoré par `.gitignore` : vérifie qu'il n'apparaît jamais dans `git status`.

```powershell
git init
git add .
git status            # .env NE doit PAS apparaître dans la liste
git commit -m "Portfolio : première version"
```
Sur GitHub, crée un dépôt **vide** `portfolio` (sans README) sur ton compte `322sts`, puis :
```powershell
git branch -M main
git remote add origin https://github.com/322sts/portfolio.git
git push -u origin main
```

---

## 3. Créer les services gratuits

Ouvre un fichier texte temporaire (hors du projet) pour noter les valeurs. Tu les colleras dans Vercel à l'étape 4.

### 3.1 Neon (base PostgreSQL), obligatoire
1. https://neon.tech → inscription (connexion GitHub possible) → **Create project**, région **Europe (Frankfurt)**.
2. Dans **Connection details**, récupère **deux** URL :
   - l'URL **pooled** (le nom d'hôte contient `-pooler`) → ce sera `DATABASE_URL` sur Vercel ;
   - l'URL **directe** (case « Pooled connection » décochée) → pour les migrations depuis ton PC.
   Les deux finissent par `?sslmode=require`.

### 3.2 Secret d'authentification, obligatoire
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Note le résultat : c'est `AUTH_SECRET`. Génère-en un **nouveau** pour la prod, ne réutilise pas celui du `.env` local.

### 3.3 Cloudflare Turnstile (anti-spam), obligatoire en prod
1. https://dash.cloudflare.com → inscription → **Turnstile** → **Add widget**.
2. Domaine (hostname) : tu le connaîtras après le premier déploiement (étape 4), par exemple `alban-grelaud.vercel.app`. Tu peux créer le widget maintenant avec `localhost` puis ajouter le domaine Vercel ensuite.
3. Mode **Managed**. Note la **Site key** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) et la **Secret key** (`TURNSTILE_SECRET_KEY`).

### 3.4 Resend (emails du formulaire de contact), recommandé
1. https://resend.com → inscription **avec l'adresse `albangrelaud@proton.me`**.
   Sans domaine à toi, Resend n'envoie qu'à l'adresse du compte : c'est exactement ce qu'il faut ici.
2. **API Keys** → **Create API Key** (permission « Sending access ») → `RESEND_API_KEY`.

Sans Resend, les messages restent consultables dans `/admin/messages`, tu ne reçois juste pas d'email.

### 3.5 Cloudinary (images, CV, photo), recommandé
1. https://cloudinary.com → inscription (offre Free).
2. Dans le **Dashboard** : `Cloud name`, `API Key`, `API Secret` → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. **Settings → Security** : vérifie que **PDF and ZIP files delivery** est autorisé, sinon le lien du CV ne s'ouvrira pas.

Sans Cloudinary, l'admin te propose de coller une URL d'image.

### 3.6 Connexion « avec GitHub » pour les visiteurs, facultatif
À faire **après** le premier déploiement, quand tu connais l'URL du site.
1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL : `https://<ton-site>.vercel.app`
   Authorization callback URL : `https://<ton-site>.vercel.app/api/auth/callback/github`
3. Note le **Client ID** (`AUTH_GITHUB_ID`), puis **Generate a new client secret** (`AUTH_GITHUB_SECRET`).

---

## 4. Préparer la base Neon depuis ton PC

On crée les tables et ton compte admin **une fois**, depuis ton ordinateur, avec l'URL **directe** de Neon. Les variables tapées dans PowerShell passent avant celles du `.env`, sans le modifier.

```powershell
cd "C:\Users\banba\Desktop\DEV\VIBE CODE\portfolio"
$env:DATABASE_URL = "postgresql://...URL DIRECTE NEON...?sslmode=require"
$env:ADMIN_INITIAL_PASSWORD = "un-mot-de-passe-long-et-unique"
npx prisma migrate deploy
npm run db:seed
Remove-Item Env:DATABASE_URL, Env:ADMIN_INITIAL_PASSWORD
```
- `migrate deploy` crée les tables (sans base fantôme, c'est la commande prévue pour la prod).
- `db:seed` ajoute les catégories, tes 3 projets et ton compte admin avec **ce** mot de passe. Garde-le dans un gestionnaire de mots de passe : il n'y a pas encore de page « changer mon mot de passe ».
- Les deux dernières lignes effacent les variables du terminal, pour ne pas viser Neon par erreur ensuite.

À refaire uniquement quand le schéma de base change (nouvelle migration) : seulement `npx prisma migrate deploy`, avec l'URL directe.

---

## 5. Déployer sur Vercel

1. https://vercel.com → **Sign up with GitHub** → offre **Hobby** (gratuite, usage non commercial : parfait pour un portfolio).
2. **Add New → Project** → importe le dépôt `322sts/portfolio`. Vercel détecte Next.js tout seul : ne change ni la commande de build ni le dossier.
3. Avant de cliquer sur Deploy, ouvre **Environment Variables** et ajoute :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL **pooled** de Neon |
| `AUTH_SECRET` | le secret généré en 3.2 |
| `NEXT_PUBLIC_SITE_URL` | `https://<ton-site>.vercel.app` (à corriger après le 1er déploiement si besoin) |
| `CONTACT_TO_EMAIL` | `albangrelaud@proton.me` |
| `ADMIN_EMAIL` | `albangrelaud@proton.me` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Turnstile |
| `RESEND_API_KEY` | Resend (si créé) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary (si créé) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth (si créé) |

Ne mets **pas** `ADMIN_INITIAL_PASSWORD` ni `SHADOW_DATABASE_URL` sur Vercel : ils ne servent qu'en local.

4. **Deploy**. Au bout de 1 à 2 minutes, tu obtiens l'URL `https://<nom>.vercel.app`.
   Pour la changer : **Settings → Domains** → modifie le sous-domaine `.vercel.app` (par exemple `alban-grelaud.vercel.app`).
5. Si l'URL a changé :
   - mets à jour `NEXT_PUBLIC_SITE_URL` ;
   - ajoute le domaine dans le widget Turnstile ;
   - crée l'app GitHub OAuth (3.6) ;
   - puis **Deployments → ⋯ → Redeploy** pour que les nouvelles variables soient prises en compte.

Ensuite, chaque `git push` sur `main` redéploie automatiquement le site.

---

## 6. Vérifier la mise en ligne

1. Ouvre le site : accueil, `/projets`, une page projet, `/en`.
2. Ouvre `/admin`. Tu dois être renvoyé vers la connexion. Connecte-toi avec `albangrelaud@proton.me` et le mot de passe choisi en 4.
3. Dans **Profil** : écris ta vraie bio (FR et EN), envoie ton CV en PDF et ta photo.
   La bio de départ répète le sous-titre de l'accueil ; remplace-la par 2 ou 3 phrases à toi.
4. Envoie-toi un message depuis `/contact`. Il doit arriver dans `/admin/messages` et, si Resend est configuré, dans ta boîte Proton (regarde les spams la première fois).
5. Remplis la rubrique **Méthode IA** du projet « Ce portfolio » : outils utilisés, ce que tu as délégué, ce que tu as vérifié ou corrigé. C'est ce qu'un recruteur lira.
6. Partage l'URL dans le [débogueur LinkedIn](https://www.linkedin.com/post-inspector/) pour vérifier l'aperçu (image cyanotype).

---

## 7. Ajouter un projet (sans toucher au code)

`/admin/projets` → **Nouveau projet**.
- Onglets **FR / EN** : titre, résumé, objectifs, corps, résultats, méthode IA.
- Le corps est en Markdown, avec un bouton **Aperçu** et une aide de syntaxe :
  - formules : `$\sigma\sqrt{T}$` en ligne, `$$ ... $$` en bloc ;
  - code : trois accents graves suivis du langage, par exemple ```` ```python ````;
  - graphique interactif : un bloc ```` ```chart ```` contenant du JSON :
    ```
    { "title": "Backtest", "xLabel": "Date", "yLabel": "Valeur", "unit": "€",
      "series": [ { "name": "Stratégie", "points": [["2026-01-02", 100], ["2026-02-02", 104]] } ] }
    ```
    Deux séries au maximum par graphique, pour rester lisible.
- Coche **Assisté par IA** pour les projets faits avec l'IA. Ils auront un badge et un filtre dédié.
- Tu peux remplacer le schéma généré de la planche en envoyant ton propre fichier `.svg`. Il est nettoyé automatiquement.
- Laisse le projet en **Brouillon**, vérifie-le avec **Aperçu**, puis passe-le en **Publié**.

---

## 8. Sécurité : les règles à garder

- Ne versionne **jamais** `.env`. Si un secret fuit, régénère-le chez le service concerné et mets à jour Vercel.
- Ne donne le rôle ADMIN à personne d'autre. Le rôle ne s'attribue que dans la base (Prisma Studio ou la console Neon), jamais depuis le site.
- Modère les commentaires dans `/admin/commentaires` : rien n'est publié sans ta validation.
