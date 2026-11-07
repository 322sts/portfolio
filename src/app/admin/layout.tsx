import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell/AdminShell";
import { SkipLink } from "@/components/skip-link/SkipLink";
import { getThemePreference } from "@/components/theme/server";
import { themeAttribute } from "@/components/theme/theme";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.css";

// Layout racine ADMIN, séparé du layout public : FR uniquement, hors i18n (SPEC §2).
// Le rôle ADMIN est vérifié ici ET dans chaque Server Action admin (SPEC §3).

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const theme = await getThemePreference();

  return (
    <html lang="fr" className={fontVariables} data-theme={themeAttribute(theme)} data-scroll-behavior="smooth">
      <body>
        <SkipLink label="Aller au contenu" />
        <AdminShell user={{ email: user.email, name: user.name }} theme={theme}>
          {/* Fournisseur next-intl (FR) : certains composants partagés (graphiques Markdown,
              planches) lisent leurs libellés via next-intl, y compris dans les aperçus admin. */}
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </AdminShell>
      </body>
    </html>
  );
}
