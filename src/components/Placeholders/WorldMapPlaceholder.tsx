"use client";

import { useTranslations } from "next-intl";
import PlaceholderCard from "./PlaceholderCard";

const icon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-10 w-10"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" />
  </svg>
);

export default function WorldMapPlaceholder() {
  const t = useTranslations("Placeholders");
  return (
    <PlaceholderCard
      title={t("mapTitle")}
      text={t("mapText")}
      icon={icon}
      href="/map"
    />
  );
}
