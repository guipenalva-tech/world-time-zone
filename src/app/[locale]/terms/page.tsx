import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TermsView from "@/components/Legal/TermsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("termsTitle"), description: t("termsDescription") };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <TermsView locale={locale} />;
}
