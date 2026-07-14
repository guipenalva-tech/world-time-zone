import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FlightsView from "@/components/Flights/FlightsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Flights" });
  return { title: t("title"), description: t("description") };
}

export default function FlightsPage() {
  return <FlightsView />;
}
