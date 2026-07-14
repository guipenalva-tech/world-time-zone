import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import StubPage from "@/components/Placeholders/StubPage";
import { NewsIcon } from "@/components/icons/NavIcons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "News" });
  return { title: t("title"), description: t("description") };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "News" });

  return (
    <StubPage
      heading={t("heading")}
      subtitle={t("subtitle")}
      cardTitle={t("comingSoonTitle")}
      cardText={t("comingSoonText")}
      icon={<NewsIcon className="h-10 w-10" />}
    />
  );
}
