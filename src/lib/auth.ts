import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { CredentialsSignin, type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { getPathname } from "@/lib/i18n/navigation";
import { getClientIp } from "@/lib/security/ip";
import { verifyPassword } from "@/lib/security/password";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

/*
 * Auth.js v5 (SPEC §1 et §5).
 *  - Stratégie JWT (cookie httpOnly, SameSite=Lax, Secure + préfixe __Secure- en prod).
 *  - Credentials : email + mot de passe argon2id, message d'erreur générique,
 *    limitation 5 échecs / 15 min par email et par IP (table LoginAttempt).
 *  - GitHub : uniquement si les variables sont présentes. Le rôle ne vient JAMAIS
 *    du fournisseur : il est lu en BDD (défaut VISITOR). Pas de liaison automatique
 *    par email (allowDangerousEmailAccountLinking=false) : un compte GitHub portant
 *    l'email de l'admin ne peut pas se greffer sur le compte admin.
 *  - auth()/requireUser()/requireAdmin() conservent les signatures des stubs de l'agent 1.
 */

// --- Typage (module augmentation) --------------------------------------------

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
  }
}

// --- Erreurs Credentials (le `code` est exposé au client : rester générique) ---

class InvalidCredentials extends CredentialsSignin {
  code = "invalid";
}

export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

// --- Configuration -------------------------------------------------------------

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    credentials: { email: {}, password: {} },
    async authorize(credentials, request) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) throw new InvalidCredentials();
      const { email, password } = parsed.data;
      const ip = getClientIp(request.headers);

      // Bloqué AVANT toute vérification : même le bon mot de passe est refusé.
      if (await isLoginBlocked(email, ip)) throw new TooManyAttempts();

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, image: true, role: true, passwordHash: true },
      });
      const valid = await verifyPassword(user?.passwordHash, password);
      await recordLoginAttempt(email, ip, valid && Boolean(user));
      if (!valid || !user) throw new InvalidCredentials();

      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
];

if (features.githubOAuth) {
  providers.push(
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

const isProd = env.NODE_ENV === "production";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers,
  secret: env.AUTH_SECRET,
  // Derrière Vercel (Host fiable) et en local.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  useSecureCookies: isProd,
  pages: { signIn: "/connexion", error: "/connexion" },
  callbacks: {
    async jwt({ token, user }) {
      // Connexion : le rôle est relu en BDD (jamais fourni par GitHub ni par le client).
      if (user?.id) {
        const fromDb = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
        token.uid = user.id;
        token.role = fromDb?.role ?? "VISITOR";
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.user.role = token.role ?? "VISITOR";
      return session;
    },
  },
  logger: {
    // Les échecs de connexion sont normaux : on ne pollue pas les logs avec leur pile.
    error(error) {
      if (error instanceof CredentialsSignin) return;
      const cause = (error as Error & { type?: string }).type;
      if (cause === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
};

const nextAuth = NextAuth(config);

export const { handlers, signIn, signOut } = nextAuth;

// --- API publique (signatures figées par l'agent 1) ----------------------------

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
};

export type AppSession = {
  user: SessionUser;
  expires: string;
};

/** Session courante (Server Components, Server Actions, Route Handlers), ou null. */
export async function auth(): Promise<AppSession | null> {
  const session = await nextAuth.auth();
  const u = session?.user;
  if (!session || !u?.id || !u.email) return null;
  return {
    user: { id: u.id, email: u.email, name: u.name ?? null, image: u.image ?? null, role: u.role },
    expires: session.expires,
  };
}

/** Chemin de la requête courante, posé par `src/proxy.ts` (en-tête `x-pathname`). */
async function currentPath(): Promise<string> {
  const h = await headers();
  const path = h.get("x-pathname");
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/** URL de la page de connexion localisée, avec `callbackUrl` vers la page courante. */
async function loginUrl(): Promise<string> {
  const path = await currentPath();
  const locale = path === "/en" || path.startsWith("/en/") ? "en" : "fr";
  const base = getPathname({ href: "/connexion", locale });
  return `${base}?callbackUrl=${encodeURIComponent(path)}`;
}

/** Relit l'utilisateur en BDD : compte supprimé ou rôle modifié pris en compte immédiatement. */
async function freshUser(id: string): Promise<SessionUser | null> {
  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, image: true, role: true },
  });
}

/** Exige un utilisateur connecté. À appeler en tête de chaque Server Action protégée. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session ? await freshUser(session.user.id) : null;
  if (!user) redirect(await loginUrl());
  return user;
}

/**
 * Exige le rôle ADMIN (layout admin ET chaque action admin, SPEC §3).
 * Non connecté → page de connexion ; connecté sans le rôle → 404 (ne révèle rien).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
