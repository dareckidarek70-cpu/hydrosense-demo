import type { Metadata } from "next";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { LanguageSwitcher, LocaleProvider } from "@/components/locale";
import { PreviewPalette } from "@/components/preview-palette";
import { SiteNavigation } from "@/components/site-navigation";
import { getLocalization } from "@/lib/i18n/server";
import "./globals.css";
import "./print.css";
import "./preview-palettes.css";

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
  const isPalettePreview = process.env.VERCEL_ENV === "preview";
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body data-theme-preview={isPalettePreview ? "enabled" : undefined}>
        <LocaleProvider locale={locale}>
          <div className="app-shell">
            <a className="skip-link" href="#main-content">{t("skipContent")}</a>
            <header className="site-header">
              <div className="container site-nav">
                <HydroSenseWordmark href="/" subline={t("brand")} partnersLabel={t("partners")} />
                <SiteNavigation />
                <LanguageSwitcher />
              </div>
              {isPalettePreview ? <PreviewPalette /> : null}
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
