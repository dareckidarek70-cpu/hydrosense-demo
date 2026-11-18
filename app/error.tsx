"use client";

import { useLocale } from "@/components/locale";

export default function ErrorView({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <section className="container page-section" role="alert">
      <h1 className="section-title">{t("unexpected")}</h1>
      <button type="button" className="button-secondary" onClick={reset}>{t("reload")}</button>
    </section>
  );
}
