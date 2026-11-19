import type { Metadata } from "next";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { LanguageSwitcher, LocaleProvider } from "@/components/locale";
import { SiteNavigation } from "@/components/site-navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getLocalization } from "@/lib/i18n/server";
import { defaultTheme, themeBootScript } from "@/lib/theme";
import "./globals.css";
import "./print.css";
import "./themes.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getLocalization();
  return { title: t("siteTitle"), description: t("siteDescription") };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getLocalization();
  return (
    <html lang={locale} data-scroll-behavior="smooth" data-theme={defaultTheme} suppressHydrationWarning>
      <head>
        <script id="hydrosense-theme" dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <div className="app-shell">
            <a className="skip-link" href="#main-content">{t("skipContent")}</a>
            <header className="site-header">
              <div className="container site-nav">
                <HydroSenseWordmark href="/" subline={t("brand")} partnersLabel={t("partners")} />
                <SiteNavigation />
                <div className="nav-preferences">
                  <LanguageSwitcher />
                  <ThemeSwitcher />
                </div>
              </div>
            </header>
            <main id="main-content" tabIndex={-1}>{children}</main>
            <footer className="site-footer">
              <div className="container footer-note">
                <HydroSenseWordmark subline={t("brand")} partnersLabel={t("partners")} />
                <p><strong>{t("prototype")}</strong> {t("foot")}</p>
                <small>{t("support")}</small>
              </div>
            </footer>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
