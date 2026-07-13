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
  return { title: t("sunTitle"), description: t("sunDescription") };
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
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6l1.6-1.6M18 6l1.6-1.6" />
  </svg>
);

export default async function SunPage({
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
      heading={t("sun")}
      subtitle={tMeta("sunDescription")}
      cardTitle={tPlaceholders("sunTitle")}
      cardText={tPlaceholders("sunText")}
      icon={icon}
    />
  );
}
