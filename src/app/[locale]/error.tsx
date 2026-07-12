"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-foreground/70">{t("description")}</p>
      <button
        onClick={() => unstable_retry()}
        className="rounded-full bg-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("retry")}
      </button>
    </main>
  );
}
