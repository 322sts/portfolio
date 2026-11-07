import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { features } from "@/lib/env";
import { getPathname, Link } from "@/lib/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/routing";
import { safeCallbackUrl } from "@/lib/security/callback-url";
import { Notice } from "@/components/notice/Notice";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import styles from "./auth.module.css";
import { LoginForm } from "./login-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const sp = await searchParams;

  // callbackUrl validé (même origine uniquement) ; défaut : /compte localisé.
  const callbackUrl = safeCallbackUrl(sp.callbackUrl, getPathname({ href: "/compte", locale }));
  if (await auth()) redirect(callbackUrl);

  const t = await getTranslations("auth");
  // Erreurs renvoyées par Auth.js (?error=…) : jamais affichées telles quelles.
  const authError = typeof sp.error === "string" ? sp.error : null;
  const errorText =
    authError === null
      ? null
      : authError === "CredentialsSignin"
        ? sp.code === "rate_limited"
          ? t("tooManyAttempts")
          : t("invalidCredentials")
        : t("oauthError");

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">{t("accountSheet")}</p>
        <h1>{t("loginTitle")}</h1>
        <p className={styles.intro}>{t("loginIntro")}</p>
      </header>
      <div className={styles.panel}>
        {errorText ? <Notice tone="error">{errorText}</Notice> : null}
        <LoginForm callbackUrl={callbackUrl} githubEnabled={features.githubOAuth} />
        <p className={styles.alt}>
          {t("noAccount")}{" "}
          <Link href={{ pathname: "/inscription", query: { callbackUrl } }}>{t("registerTitle")}</Link>
        </p>
      </div>
      <TitleBlock title={t("loginTitle")} sheet={null} />
    </main>
  );
}
