import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";

/**
 * Proxy Next 16 (ex-middleware) :
 *  1. génère un nonce par requête et pose la CSP (pattern officiel Next : la CSP est
 *     placée sur la requête pour que Next applique le nonce à ses scripts, et sur la réponse) ;
 *  2. pose `x-pathname` (utilisé par requireUser() pour le callbackUrl) ;
 *  3. délègue l'i18n à next-intl, sauf pour `/admin` (FR, hors i18n) qui reçoit
 *     quand même les en-têtes.
 * Les autres en-têtes de sécurité (statiques) sont posés dans next.config.ts pour
 * toutes les routes, y compris /api et les fichiers statiques.
 */

const handleI18nRouting = createMiddleware(routing);

const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' : les scripts chargés par un script de confiance (nonce) sont
    // autorisés ; les hôtes listés servent de repli aux navigateurs anciens.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://challenges.cloudflare.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://res.cloudinary.com",
      "https://avatars.githubusercontent.com",
    ],
    "font-src": ["'self'", "data:"],
    // api.cloudinary.com : upload signé direct depuis l'admin (Agent 5).
    "connect-src": [
      "'self'",
      "https://challenges.cloudflare.com",
      "https://api.cloudinary.com",
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "frame-src": ["https://challenges.cloudflare.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // GitHub : la soumission du formulaire OAuth redirige vers github.com.
    "form-action": ["'self'", "https://github.com"],
    "frame-ancestors": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const { pathname, search } = request.nextUrl;

  // En-têtes de requête : next-intl recopie `request.headers` dans sa réponse
  // (NextResponse.next/rewrite({ request: { headers } })), donc on les pose avant.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  request.headers.set("x-pathname", `${pathname}${search}`);

  const response = isAdminPath(pathname)
    ? NextResponse.next({ request: { headers: request.headers } })
    : handleI18nRouting(request);

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Toutes les pages (y compris /admin) ; pas /api, /_next, /_vercel ni les fichiers.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
