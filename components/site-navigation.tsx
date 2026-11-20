"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { demoReportHref, reportHref, reportTop } from "@/lib/report-navigation";
import { useLocale } from "./locale";

const items = [
  { href: "/", label: "home" },
  { href: "/select-area", label: "selectArea" },
] as const;

const lastReportKey = "hydrosense:last-report";

function subscribeToReport(update: () => void) {
  window.addEventListener(lastReportKey, update);
  return () => window.removeEventListener(lastReportKey, update);
}

function readLastReport() {
  try {
    const href = window.sessionStorage.getItem(lastReportKey);
    return href?.startsWith("/results?") ? reportHref(new URLSearchParams(href.slice(9))) : null;
  } catch {
    return null;
  }
}

export function SiteNavigation() {
  const path = usePathname();
  const search = useSearchParams().toString();
  const inReport = path === "/results";
  const lastReport = useSyncExternalStore(subscribeToReport, readLastReport, () => null);
  const nav = useRef<HTMLElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!inReport) return;
    const href = reportHref(new URLSearchParams(search));
    if (!href) return;
    try {
      window.sessionStorage.setItem(lastReportKey, href);
      window.dispatchEvent(new Event(lastReportKey));
    } catch {
      // The current report still works if session storage is unavailable.
    }
  }, [inReport, search]);

  useEffect(() => {
    const header = nav.current?.closest("header");
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--site-header-height", `${header.offsetHeight}px`);
    const resize = new ResizeObserver(update);
    update();
    resize.observe(header);
    return () => resize.disconnect();
  }, []);

  return (
    <nav ref={nav} className="nav-links" aria-label={t("nav")}>
      {items.map(({ href, label }) => (
        <Link key={href} href={href} className="nav-link" aria-current={path === href ? "page" : undefined}>
          {t(label)}
        </Link>
      ))}
      {inReport ? <a href={`#${reportTop}`} className="nav-link" aria-current="page">{t("brief")}</a>
        : <Link href={lastReport ?? demoReportHref} className="nav-link">{t(!lastReport || lastReport.includes("?parcel=") ? "navDemo" : "brief")}</Link>}
    </nav>
  );
}
