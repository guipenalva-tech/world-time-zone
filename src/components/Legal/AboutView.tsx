import { getTranslations } from "next-intl/server";
import LegalArticle, { LegalSection } from "./LegalArticle";

/**
 * About (/about) — product description + data-source credits. Google's
 * AdSense review looks favorably on pages that clearly disclose where a
 * site's data comes from, so this lists all 3 live external APIs
 * (Open-Meteo, Frankfurter, Google News) plus the build-time Natural
 * Earth map data and Wikidata-sourced localized city/country names
 * (src/data/cityNames.json, see scripts/build-city-names.mjs), matching
 * what `PrivacyView` also discloses.
 */
export default async function AboutView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "About" });

  return (
    <LegalArticle title={t("pageTitle")} subtitle={t("pageSubtitle")}>
      <p className="text-sm leading-relaxed text-foreground/80">{t("introP1")}</p>

      <LegalSection heading={t("whoHeading")}>
        <p>{t("whoP1")}</p>
      </LegalSection>

      <LegalSection heading={t("featuresHeading")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("featureComparator")}</li>
          <li>{t("featureChart")}</li>
          <li>{t("featureMap")}</li>
          <li>{t("featureSun")}</li>
          <li>{t("featureAlerts")}</li>
          <li>{t("featureWeather")}</li>
          <li>{t("featureCurrency")}</li>
          <li>{t("featureNews")}</li>
          <li>{t("featureFlights")}</li>
        </ul>
      </LegalSection>

      <LegalSection heading={t("dataHeading")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("dataOpenMeteo")}</li>
          <li>{t("dataFrankfurter")}</li>
          <li>{t("dataNews")}</li>
          <li>{t("dataMap")}</li>
          <li>{t("dataCityNames")}</li>
        </ul>
      </LegalSection>

      <LegalSection heading={t("noAccountHeading")}>
        <p>{t("noAccountP1")}</p>
      </LegalSection>

      <LegalSection heading={t("contactHeading")}>
        <p>{t("contactP1")}</p>
      </LegalSection>
    </LegalArticle>
  );
}
