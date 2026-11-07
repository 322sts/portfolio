import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPathname, Link } from "@/lib/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/routing";
import { safeCallbackUrl } from "@/lib/security/callback-url";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";
import { TitleBlock } from "@/components/title-block/TitleBlock";
import styles from "../connexion/auth.module.css";
import { RegisterForm } from "./register-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "auth" });
  return { title: t("registerTitle"), robots: { index: false } };
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const sp = await searchParams;

  const callbackUrl = safeCallbackUrl(sp.callbackUrl, getPathname({ href: "/compte", locale }));
  if (await auth()) redirect(callbackUrl);

  const t = await getTranslations("auth");

  return (
    <main id="contenu" className={styles.page}>
      <header className={styles.head}>
        <p className="mono-caps">{t("accountSheet")}</p>
        <h1>{t("registerTitle")}</h1>
        <p className={styles.intro}>{t("registerIntro")}</p>
      </header>
      <div className={styles.panel}>
        <RegisterForm callbackUrl={callbackUrl} turnstileSiteKey={getTurnstileSiteKey()} />
        <p className={styles.alt}>
          {t("hasAccount")}{" "}
          <Link href={{ pathname: "/connexion", query: { callbackUrl } }}>{t("loginTitle")}</Link>
        </p>
      </div>
      <TitleBlock title={t("registerTitle")} sheet={null} />
    </main>
  );
}
