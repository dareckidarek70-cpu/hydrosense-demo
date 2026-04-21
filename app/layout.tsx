import type { Metadata } from "next";
import Link from "next/link";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import "./globals.css";

export const metadata: Metadata = {
  title: "HydroSense | AI-Assisted Satellite Field Intelligence",
  description:
    "HydroSense is an investor-facing concept for Copernicus/GIS-informed parcel intelligence and decision-ready agricultural land analysis."
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/select-area", label: "Select Area" },
  { href: "/results", label: "Brief" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="container site-nav">
              <HydroSenseWordmark href="/" subline="Parcel Intelligence" />
              <nav className="nav-links" aria-label="Main navigation">
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    className={index === navItems.length - 1 ? "nav-link nav-link--cta" : "nav-link"}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="container footer-note">
            HydroSense is a concept prototype. All parcel analysis and recommendations are demo-only and based on mocked
            Copernicus/GIS-style interpretation.
          </footer>
        </div>
      </body>
    </html>
  );
}
