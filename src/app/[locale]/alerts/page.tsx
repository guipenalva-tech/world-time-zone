import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AlertsView from "@/components/Alerts/AlertsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("alertsTitle"), description: t("alertsDescription") };
}

export default function AlertsPage() {
  return <AlertsView />;
}
