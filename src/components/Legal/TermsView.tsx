import { getTranslations } from "next-intl/server";
import LegalArticle, { LegalSection } from "./LegalArticle";

/**
 * Terms of Use (/terms). The flight-estimate disclaimer here deliberately
 * echoes `DisclaimerBanner` (shown directly on /flights) — that banner
 * covers the in-product warning, this page covers the legal one — since
 * `src/lib/flightEstimate.ts` computes prices/durations from distance and
 * date only, never from a real airline API.
 */
export default async function TermsView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Terms" });

  return (
    <LegalArticle
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      effectiveDate={t("effectiveDate")}
    >
      <p className="text-sm leading-relaxed text-foreground/80">{t("introP1")}</p>

      <LegalSection heading={t("serviceHeading")}>
        <p>{t("serviceP1")}</p>
      </LegalSection>

      <LegalSection heading={t("disclaimerHeading")}>
        <p>{t("disclaimerP1")}</p>
        <p className="font-medium text-foreground">{t("disclaimerFlights")}</p>
        <p>{t("disclaimerOthers")}</p>
      </LegalSection>

      <LegalSection heading={t("noWarrantyHeading")}>
        <p>{t("noWarrantyP1")}</p>
      </LegalSection>

      <LegalSection heading={t("liabilityHeading")}>
        <p>{t("liabilityP1")}</p>
      </LegalSection>

      <LegalSection heading={t("ipHeading")}>
        <p>{t("ipP1")}</p>
      </LegalSection>

      <LegalSection heading={t("acceptableUseHeading")}>
        <p>{t("acceptableUseP1")}</p>
      </LegalSection>

      <LegalSection heading={t("changesHeading")}>
        <p>{t("changesP1")}</p>
      </LegalSection>

      <LegalSection heading={t("contactHeading")}>
        <p>{t("contactP1")}</p>
      </LegalSection>
    </LegalArticle>
  );
}
