/**
 * Seed idempotent du portfolio (SPEC §0).
 * Lancer : `npm run db:seed` (ou `npx prisma db seed`).
 *
 * Politique : le seed CRÉE ce qui manque mais n'écrase jamais un contenu
 * existant (projets, profil, mot de passe admin) pour ne pas effacer les
 * modifications faites depuis l'admin. Les libellés des catégories et
 * technologies, eux, sont resynchronisés.
 *
 * Règle absolue : aucun fait inventé (pas de chiffres, pas de résultats).
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  ProjectStatus,
  Role,
  TeamType,
  type Locale,
} from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant (voir .env.example).");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

const categories: Array<{
  slug: string;
  schematicStyle: "finance" | "maths" | "info" | "ia" | "generic";
  sortOrder: number;
  name: Record<Locale, string>;
}> = [
  { slug: "finance", schematicStyle: "finance", sortOrder: 1, name: { fr: "Finance", en: "Finance" } },
  { slug: "maths", schematicStyle: "maths", sortOrder: 2, name: { fr: "Mathématiques", en: "Mathematics" } },
  { slug: "info", schematicStyle: "info", sortOrder: 3, name: { fr: "Informatique", en: "Computer science" } },
  {
    slug: "ia",
    schematicStyle: "ia",
    sortOrder: 4,
    name: { fr: "Intelligence artificielle", en: "Artificial intelligence" },
  },
];

const technologies: Array<{ slug: string; name: string }> = [
  { slug: "python", name: "Python" },
  { slug: "csharp", name: "C#" },
  { slug: "nextjs", name: "Next.js" },
  { slug: "typescript", name: "TypeScript" },
  { slug: "postgresql", name: "PostgreSQL" },
  { slug: "prisma", name: "Prisma" },
];

type SeedTranslation = {
  title: string;
  summary: string;
  objectives?: string;
  body: string;
};

type SeedProject = {
  slug: string;
  /** Format AAAA-MM ; stocké au 1er du mois (UTC). */
  month: string;
  teamType: TeamType;
  aiAssisted: boolean;
  githubUrl: string | null;
  categories: string[];
  technologies: string[];
  sortOrder: number;
  translations: Record<Locale, SeedTranslation>;
};

const projects: SeedProject[] = [
  {
    slug: "jeu-de-nim",
    month: "2024-11",
    teamType: TeamType.TEAM,
    aiAssisted: false,
    githubUrl: "https://github.com/322sts/the-game-of-nim",
    categories: ["info"],
    technologies: ["python"],
    sortOrder: 1,
    translations: {
      fr: {
        title: "Le jeu de Nim",
        summary:
          "Projet Python réalisé en équipe : le jeu de Nim, avec un code typé, lisible et commenté, vérifié par des assertions.",
        objectives:
          "Programmer en équipe le jeu de Nim en Python, avec une écriture typée, lisible et commentée, et des assertions servant de tests.",
        body: [
          "Projet réalisé en équipe en Python : une version du jeu de Nim.",
          "",
          "## Démarche",
          "",
          "- Écriture typée (annotations de type Python).",
          "- Code lisible et commenté.",
          "- Assertions utilisées comme tests.",
          "",
          "## Contexte mathématique",
          "",
          "Le jeu de Nim est un jeu combinatoire classique. Le théorème de Bouton (1901) caractérise ses positions : une position est perdante pour le joueur qui doit jouer si et seulement si le XOR (ou exclusif bit à bit) des tailles des tas est nul.",
          "",
          "$$",
          "n_1 \\oplus n_2 \\oplus \\cdots \\oplus n_k = 0",
          "$$",
          "",
          "Ce résultat est rappelé ici à titre de contexte.",
        ].join("\n"),
      },
      en: {
        title: "The Game of Nim",
        summary:
          "Team project in Python: the game of Nim, with typed, readable and commented code, checked with assertions.",
        objectives:
          "Build the game of Nim in Python as a team, with typed, readable and commented code, and assertions used as tests.",
        body: [
          "Team project in Python: a version of the game of Nim.",
          "",
          "## Approach",
          "",
          "- Typed code (Python type hints).",
          "- Readable, commented code.",
          "- Assertions used as tests.",
          "",
          "## Mathematical background",
          "",
          "Nim is a classic combinatorial game. Bouton's theorem (1901) characterises its positions: a position is losing for the player to move if and only if the XOR (bitwise exclusive or) of the heap sizes is zero.",
          "",
          "$$",
          "n_1 \\oplus n_2 \\oplus \\cdots \\oplus n_k = 0",
          "$$",
          "",
          "This result is mentioned here as background.",
        ].join("\n"),
      },
    },
  },
  {
    slug: "calculateur-aire",
    month: "2026-09",
    teamType: TeamType.SOLO,
    aiAssisted: false,
    githubUrl: "https://github.com/322sts/firstCsharp-Project",
    categories: ["info"],
    technologies: ["csharp"],
    sortOrder: 2,
    translations: {
      fr: {
        title: "Calculateur d'aire de formes simples",
        summary:
          "Petite application console en C# : choisir une forme géométrique, entrer des valeurs, obtenir son aire.",
        body: [
          "Petite application console écrite en C#.",
          "",
          "## Fonctionnement",
          "",
          "1. L'utilisateur choisit une forme géométrique.",
          "2. Il saisit les valeurs demandées.",
          "3. Le programme calcule et affiche l'aire de la forme.",
        ].join("\n"),
      },
      en: {
        title: "Simple Shape Area Calculator",
        summary:
          "Small C# console application: pick a geometric shape, enter values, get its area.",
        body: [
          "Small console application written in C#.",
          "",
          "## How it works",
          "",
          "1. The user picks a geometric shape.",
          "2. They enter the requested values.",
          "3. The program computes and displays the shape's area.",
        ].join("\n"),
      },
    },
  },
  {
    slug: "portfolio",
    month: "2026-11",
    teamType: TeamType.SOLO,
    aiAssisted: true,
    githubUrl: null,
    categories: ["info"],
    technologies: ["nextjs", "typescript", "postgresql", "prisma"],
    sortOrder: 3,
    translations: {
      fr: {
        title: "Ce portfolio",
        summary:
          "Site complet (authentification, administration, base de données) construit avec Claude Code.",
        body: [
          "Site complet construit avec Claude Code.",
          "",
          "## Contenu",
          "",
          "- Authentification.",
          "- Espace d'administration.",
          "- Base de données.",
          "",
          "## Technologies",
          "",
          "Next.js, TypeScript, PostgreSQL, Prisma.",
        ].join("\n"),
      },
      en: {
        title: "This portfolio",
        summary:
          "Full website (authentication, admin area, database) built with Claude Code.",
        body: [
          "Full website built with Claude Code.",
          "",
          "## Features",
          "",
          "- Authentication.",
          "- Admin area.",
          "- Database.",
          "",
          "## Technologies",
          "",
          "Next.js, TypeScript, PostgreSQL, Prisma.",
        ].join("\n"),
      },
    },
  },
];

const profile = {
  bioFr:
    "Élève-ingénieur à IMT Nord Europe. Centres d'intérêt : finance quantitative, mathématiques appliquées, intelligence artificielle et informatique.",
  bioEn:
    "Engineering student at IMT Nord Europe. Interests: quantitative finance, applied mathematics, artificial intelligence and computer science.",
  githubUrl: "https://github.com/322sts",
  linkedinUrl: "https://www.linkedin.com/in/albangrelaud/",
  email: "albangrelaud@proton.me",
};

const LOCALES: Locale[] = ["fr", "en"];

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

function monthToDate(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1));
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of categories) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: { schematicStyle: c.schematicStyle, sortOrder: c.sortOrder },
      create: { slug: c.slug, schematicStyle: c.schematicStyle, sortOrder: c.sortOrder },
    });
    for (const locale of LOCALES) {
      await db.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: cat.id, locale } },
        update: { name: c.name[locale] },
        create: { categoryId: cat.id, locale, name: c.name[locale] },
      });
    }
    ids.set(c.slug, cat.id);
  }
  return ids;
}

async function seedTechnologies(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const t of technologies) {
    const tech = await db.technology.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: t,
    });
    ids.set(t.slug, tech.id);
  }
  return ids;
}

async function seedProjects(categoryIds: Map<string, string>, techIds: Map<string, string>) {
  for (const p of projects) {
    const existing = await db.project.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) {
      console.log(`  projet « ${p.slug} » déjà présent, inchangé`);
      continue;
    }
    await db.project.create({
      data: {
        slug: p.slug,
        status: ProjectStatus.PUBLISHED,
        date: monthToDate(p.month),
        teamType: p.teamType,
        aiAssisted: p.aiAssisted,
        githubUrl: p.githubUrl,
        sortOrder: p.sortOrder,
        translations: {
          create: LOCALES.map((locale) => ({ locale, ...p.translations[locale] })),
        },
        categories: {
          create: p.categories.map((slug) => ({ categoryId: mustGet(categoryIds, slug) })),
        },
        technologies: {
          create: p.technologies.map((slug) => ({ technologyId: mustGet(techIds, slug) })),
        },
      },
    });
    console.log(`  projet « ${p.slug} » créé`);
  }
}

async function seedProfile() {
  await db.siteProfile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...profile },
  });
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
  if (!email) {
    console.warn("  ADMIN_EMAIL absent : utilisateur admin non créé.");
    return;
  }
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // On garantit le rôle, sans toucher au mot de passe (peut avoir été changé).
    await db.user.update({ where: { email }, data: { role: Role.ADMIN } });
    console.log(`  admin ${email} déjà présent (rôle vérifié, mot de passe inchangé)`);
    return;
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error("ADMIN_INITIAL_PASSWORD doit faire entre 10 et 128 caractères.");
  }
  // argon2id = algorithme par défaut de @node-rs/argon2.
  const passwordHash = await hash(password);
  await db.user.create({
    data: { email, passwordHash, role: Role.ADMIN, name: "Alban Grelaud" },
  });
  console.log(`  admin ${email} créé`);
}

function mustGet(map: Map<string, string>, key: string): string {
  const v = map.get(key);
  if (!v) throw new Error(`Référence inconnue dans le seed : ${key}`);
  return v;
}

async function main() {
  console.log("Seed : catégories…");
  const categoryIds = await seedCategories();
  console.log("Seed : technologies…");
  const techIds = await seedTechnologies();
  console.log("Seed : projets…");
  await seedProjects(categoryIds, techIds);
  console.log("Seed : profil…");
  await seedProfile();
  console.log("Seed : administrateur…");
  await seedAdmin();
  console.log("Seed terminé.");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
