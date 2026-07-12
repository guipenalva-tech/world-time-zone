import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-foreground/70">{t("description")}</p>
      <Link href="/" className="text-primary underline">
        {t("backHome")}
      </Link>
    </main>
  );
}
