import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import StubPage from "@/components/Placeholders/StubPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("alertsTitle"), description: t("alertsDescription") };
}

const icon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-10 w-10"
  >
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
);

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  const tMeta = await getTranslations({ locale, namespace: "PageMeta" });
  const tPlaceholders = await getTranslations({ locale, namespace: "Placeholders" });

  return (
    <StubPage
      heading={t("alerts")}
      subtitle={tMeta("alertsDescription")}
      cardTitle={tPlaceholders("alertsTitle")}
      cardText={tPlaceholders("alertsText")}
      icon={icon}
    />
  );
}
