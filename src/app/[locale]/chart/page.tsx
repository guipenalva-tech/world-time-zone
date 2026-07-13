import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ChartView from "@/components/Chart/ChartView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("chartTitle"), description: t("chartDescription") };
}

export default function ChartPage() {
  return <ChartView />;
}
