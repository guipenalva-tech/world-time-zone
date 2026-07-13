"use client";

import type { ReactNode } from "react";
import { useComparatorStore } from "@/stores/comparatorStore";
import PlaceholderCard from "./PlaceholderCard";
import EmptyCitiesInvite from "./EmptyCitiesInvite";

interface StubPageProps {
  /** Page heading, shown above the content either way. */
  heading: string;
  subtitle: string;
  /** Passed straight to PlaceholderCard once there's at least one city. */
  cardTitle: string;
  cardText: string;
  icon: ReactNode;
}

/**
 * Shared shell for the not-yet-implemented secondary views (Map, Sunrise &
 * Sunset, Alerts): a page heading, then either the shared "add cities"
 * invite (no cities yet) or a "coming soon" placeholder card.
 */
export default function StubPage({
  heading,
  subtitle,
  cardTitle,
  cardText,
  icon,
}: StubPageProps) {
  const cities = useComparatorStore((s) => s.cities);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-24 pt-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{heading}</h1>
        <p className="text-sm text-foreground/60">{subtitle}</p>
      </div>

      {cities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <PlaceholderCard title={cardTitle} text={cardText} icon={icon} />
      )}
    </div>
  );
}
