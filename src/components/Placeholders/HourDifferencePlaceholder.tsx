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
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-7" />
    <path d="M4 19h16" />
  </svg>
);

export default function HourDifferencePlaceholder() {
  const t = useTranslations("Placeholders");
  return (
    <PlaceholderCard title={t("hourDiffTitle")} text={t("hourDiffText")} icon={icon} />
  );
}
