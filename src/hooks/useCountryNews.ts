import { useCallback, useEffect, useState } from "react";
import type { NewsApiResponse, NewsItem } from "@/app/api/news/route";

export type NewsFetchStatus = "loading" | "success" | "error";

export interface UseCountryNewsResult {
  status: NewsFetchStatus;
  items: NewsItem[];
  fetchedAt: string | null;
  /** Re-runs the fetch (used by the error state's retry button). */
  retry: () => void;
}

/**
 * Fetches the /api/news proxy for one country and locale. One call per
 * distinct (countryCode, locale) pair — NewsView groups cities by country
 * first so two cities in the same country share a single request instead
 * of duplicating it.
 */
export function useCountryNews(
  country: string,
  countryCode: string,
  locale: string,
): UseCountryNewsResult {
  const [status, setStatus] = useState<NewsFetchStatus>("loading");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const params = new URLSearchParams({ country, countryCode, locale });

    fetch(`/api/news?${params.toString()}`)
      .then((res) => res.json() as Promise<NewsApiResponse>)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setFetchedAt(data.fetchedAt);
        setStatus(data.error ? "error" : "success");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setFetchedAt(null);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [country, countryCode, locale, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  return { status, items, fetchedAt, retry };
}
