"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCities } from "@/lib/cities";
import { getFlagEmoji } from "@/lib/flags";
import type { City } from "@/types/city";

interface CitySearchProps {
  onSelect: (city: City) => void;
  /** City ids to hide from results (e.g. cities already in the comparator). */
  excludeIds?: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CitySearch({
  onSelect,
  excludeIds = [],
  placeholder = "Add a city...",
  autoFocus = false,
}: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      const matches = searchCities(trimmed, 8 + excludeIds.length).filter(
        (c) => !excludeIds.includes(c.id),
      );
      setResults(matches.slice(0, 8));
      setIsOpen(true);
      setActiveIndex(-1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 150);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectCity(city: City) {
    onSelect(city);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const city = results[activeIndex] ?? results[0];
      if (city) selectCity(city);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        autoFocus={autoFocus}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-primary"
      />

      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        >
          {results.map((city, index) => (
            <li key={city.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-surface" : ""
                }`}
              >
                <span className="min-w-0 truncate font-medium">
                  <span aria-hidden="true" className="mr-1.5">
                    {getFlagEmoji(city.countryCode)}
                  </span>
                  {city.name}
                </span>
                <span className="shrink-0 text-xs text-foreground/50">
                  {city.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
