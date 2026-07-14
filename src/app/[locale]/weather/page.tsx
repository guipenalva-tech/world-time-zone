import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import WeatherView from "@/components/Weather/WeatherView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Weather" });
  return { title: t("title"), description: t("description") };
}

export default function WeatherPage() {
  return <WeatherView />;
}
