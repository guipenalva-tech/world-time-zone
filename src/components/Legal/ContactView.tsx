import { getTranslations } from "next-intl/server";
import LegalArticle, { LegalSection } from "./LegalArticle";

// TODO(contact): replace the placeholder address in messages/*.json
// (`Contact.emailAddress`, currently "contact@worldtimezone.example") with
// the real inbox once the production domain is registered — update all
// 11 locale files to keep parity. Do not invent a real address before then.

/**
 * Contact (/contact). The email shown comes straight from the translation
 * files as a placeholder — see the TODO above — never invented as a real,
 * working address.
 */
export default async function ContactView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Contact" });

  return (
    <LegalArticle title={t("pageTitle")} subtitle={t("pageSubtitle")}>
      <p className="text-sm leading-relaxed text-foreground/80">{t("introP1")}</p>

      <LegalSection heading={t("emailHeading")}>
        <p>
          <a
            href={`mailto:${t("emailAddress")}`}
            className="font-medium text-primary underline underline-offset-2"
          >
            {t("emailAddress")}
          </a>
        </p>
      </LegalSection>

      <LegalSection heading={t("useForHeading")}>
        <p>{t("useForP1")}</p>
      </LegalSection>

      <LegalSection heading={t("responseHeading")}>
        <p>{t("responseP1")}</p>
      </LegalSection>
    </LegalArticle>
  );
}
