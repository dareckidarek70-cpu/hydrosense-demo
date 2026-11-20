"use client";

import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, localization, type Locale } from "@/lib/i18n";

const LocaleContext = createContext(localization("pl"));
const names: Record<Locale, string> = { pl: "Polski", en: "English" };

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => localization(locale), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="locale-switch" role="group" aria-label={t("language")} aria-busy={pending}>
      {locales.map((option) => (
        <button key={option} type="button" lang={option} aria-label={names[option]}
          aria-pressed={option === locale} disabled={pending} onClick={() => {
            if (option === locale) return;
            const secure = location.protocol === "https:" ? "; Secure" : "";
            document.cookie = `${LOCALE_COOKIE}=${option}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
            startTransition(() => router.refresh());
          }}>
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
