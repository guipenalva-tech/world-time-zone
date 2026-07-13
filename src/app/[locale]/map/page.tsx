import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MapView from "@/components/Map/MapView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("mapTitle"), description: t("mapDescription") };
}

export default function MapPage() {
  return <MapView />;
}
