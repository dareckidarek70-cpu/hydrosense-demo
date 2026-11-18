import type { Metadata } from "next";
import Link from "next/link";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { LanguageSwitcher, LocaleProvider } from "@/components/locale";
import { getLocalization } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getLocalization();
  return { title: t("siteTitle"), description: t("siteDescription") };
}

const navItems = [
  { href: "/", label: "home" },
  { href: "/select-area", label: "selectArea" },
  { href: "/results", label: "brief" }
] as const;

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getLocalization();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <LocaleProvider locale={locale}>
        <div className="app-shell">
          <header className="site-header">
            <div className="container site-nav">
              <HydroSenseWordmark href="/" subline={t("brand")} partnersLabel={t("partners")} />
              <nav className="nav-links" aria-label={t("nav")}>
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    className={index === navItems.length - 1 ? "nav-link nav-link--cta" : "nav-link"}
                    href={item.href}
                  >
                    {t(item.label)}
                  </Link>
                ))}
              </nav>
              <LanguageSwitcher />
            </div>
          </header>
          <main>{children}</main>
          <footer className="container footer-note">
          <strong>{t("prototype")}</strong> {t("foot")}{" "}
          <strong>{t("support")}</strong>
          </footer>
        </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
