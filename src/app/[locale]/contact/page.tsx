import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactView from "@/components/Legal/ContactView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("contactTitle"), description: t("contactDescription") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ContactView locale={locale} />;
}
