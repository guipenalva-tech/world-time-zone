import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SunView from "@/components/Sun/SunView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PageMeta" });
  return { title: t("sunTitle"), description: t("sunDescription") };
}

export default function SunPage() {
  return <SunView />;
}
