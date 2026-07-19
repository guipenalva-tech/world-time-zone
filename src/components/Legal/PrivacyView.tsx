import { getTranslations } from "next-intl/server";
import LegalArticle, { LegalSection } from "./LegalArticle";

/**
 * Privacy Policy (/privacy) — the most important of the 4 legal pages for
 * AdSense review. Every factual claim here was checked against the actual
 * code before writing (see the sprint report for the file-by-file trail):
 * no accounts/server DB, the 3 localStorage keys actually written
 * (`wtz-settings`, `wtz-comparator`, `wtz-alerts` — plus the 4th this
 * sprint adds, `wtz-consent`), no Google Analytics/tracking script
 * anywhere in the codebase, and the exact 3 external APIs called
 * (Open-Meteo, Frankfurter, Google News RSS) plus the Natural Earth map
 * data, which is build-time static, not a live request.
 */
export default async function PrivacyView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return (
    <LegalArticle
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      effectiveDate={t("effectiveDate")}
    >
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>{t("introP1")}</p>
        <p>{t("noAccountP1")}</p>
      </div>

      <LegalSection heading={t("localStorageHeading")}>
        <p>{t("localStorageP1")}</p>
        <p>{t("localStorageP2")}</p>
      </LegalSection>

      <LegalSection heading={t("cookiesHeading")}>
        <p>{t("cookiesP1")}</p>
      </LegalSection>

      <LegalSection heading={t("adsHeading")}>
        <p>{t("adsP1")}</p>
        <p>{t("adsP2")}</p>
      </LegalSection>

      <LegalSection heading={t("analyticsHeading")}>
        <p>{t("analyticsP1")}</p>
      </LegalSection>

      <LegalSection heading={t("externalApisHeading")}>
        <p>{t("externalApisIntro")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("externalApiWeather")}</li>
          <li>{t("externalApiCurrency")}</li>
          <li>{t("externalApiNews")}</li>
          <li>{t("externalApiMap")}</li>
        </ul>
      </LegalSection>

      <LegalSection heading={t("rightsHeading")}>
        <p>{t("rightsIntro")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("rightsAccess")}</li>
          <li>{t("rightsDeletion")}</li>
          <li>{t("rightsWithdraw")}</li>
          <li>{t("rightsComplaint")}</li>
        </ul>
      </LegalSection>

      <LegalSection heading={t("revokeHeading")}>
        <p>{t("revokeP1")}</p>
      </LegalSection>

      <LegalSection heading={t("contactHeading")}>
        <p>{t("contactP1")}</p>
      </LegalSection>

      <LegalSection heading={t("changesHeading")}>
        <p>{t("changesP1")}</p>
      </LegalSection>
    </LegalArticle>
  );
}
