import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AboutView from "@/components/Legal/AboutView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("aboutTitle"), description: t("aboutDescription") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AboutView locale={locale} />;
}
