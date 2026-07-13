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
  return { title: t("mapTitle"), description: t("mapDescription") };
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
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" />
  </svg>
);

export default async function MapPage({
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
      heading={t("map")}
      subtitle={tMeta("mapDescription")}
      cardTitle={tPlaceholders("mapTitle")}
      cardText={tPlaceholders("mapText")}
      icon={icon}
    />
  );
}
