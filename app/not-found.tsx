import Link from "next/link";
import { getLocalization } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getLocalization();
  return (
    <section className="container page-section">
      <h1 className="section-title">{t("notFoundTitle")}</h1>
      <p>{t("notFoundCopy")}</p>
      <div className="button-row">
        <Link className="button" href="/select-area">{t("selectArea")}</Link>
        <Link className="button-secondary" href="/">{t("home")}</Link>
      </div>
    </section>
  );
}
