import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PrivacyView from "@/components/Legal/PrivacyView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("privacyTitle"), description: t("privacyDescription") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <PrivacyView locale={locale} />;
}
