"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./locale";

const items = [
  { href: "/", label: "home" },
  { href: "/select-area", label: "selectArea" },
  { href: "/results", label: "brief" },
] as const;

export function SiteNavigation() {
  const path = usePathname();
  const { t } = useLocale();
  return (
    <nav className="nav-links" aria-label={t("nav")}>
      {items.map(({ href, label }) => (
        <Link key={href} href={href} className="nav-link" aria-current={path === href ? "page" : undefined}>
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
