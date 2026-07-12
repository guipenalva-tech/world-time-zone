"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  answerCities,
  answerTimeQuestion,
  formatHourDiff,
  type TimeQuestionAnswer,
} from "@/lib/timeQuestion";
import { useComparatorStore } from "@/stores/comparatorStore";

type Translator = ReturnType<typeof useTranslations>;

function buildAnswerText(answer: TimeQuestionAnswer, t: Translator): string {
  switch (answer.intent) {
    case "current":
      return t("answerCurrent", {
        time: answer.time.formatted,
        city: answer.city.name,
      });

    case "convert": {
      const suffix =
        answer.dayOffset > 0
          ? ` (+${answer.dayOffset})`
          : answer.dayOffset < 0
            ? ` (${answer.dayOffset})`
            : "";
      return t("answerConvert", {
        sourceTime: answer.sourceTime.formatted,
        sourceCity: answer.sourceCity.name,
        targetTime: `${answer.targetTime.formatted}${suffix}`,
        targetCity: answer.targetCity.name,
      });
    }

    case "difference": {
      if (answer.diffHours === 0) {
        return t("answerDifferenceSame", {
          cityA: answer.cityA.name,
          cityB: answer.cityB.name,
        });
      }
      const key =
        answer.diffHours > 0 ? "answerDifferenceAhead" : "answerDifferenceBehind";
      return t(key, {
        cityA: answer.cityA.name,
        cityB: answer.cityB.name,
        hours: formatHourDiff(answer.diffHours),
      });
    }
  }
}

/**
 * Natural-language time zone question box: rule-based, 100% client-side (see
 * src/lib/timeQuestion.ts). Sits below the comparator grid as a secondary,
 * compact affordance — it should never compete visually with the grid.
 */
export default function TimeQuestionInput() {
  const locale = useLocale();
  const t = useTranslations("TimeQuestion");
  const comparedCities = useComparatorStore((s) => s.cities);
  const addCity = useComparatorStore((s) => s.addCity);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TimeQuestionAnswer | "unmatched" | null>(
    null,
  );

  const examples = t.raw("examples") as string[];

  function runQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setResult(null);
      return;
    }
    setResult(answerTimeQuestion(trimmed, locale) ?? "unmatched");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runQuestion(query);
  }

  function handleExampleClick(example: string) {
    setQuery(example);
    runQuestion(example);
  }

  const existingIds = comparedCities.map((c) => c.city.id);
  const missingCities =
    result && result !== "unmatched"
      ? answerCities(result).filter((c) => !existingIds.includes(c.id))
      : [];

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("ariaLabel")}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-primary"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface"
        >
          {t("submit")}
        </button>
      </form>

      {result && (
        <div className="mt-2 rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm">
          {result === "unmatched" ? (
            <div>
              <p className="text-foreground/70">{t("unmatchedTitle")}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {t("unmatchedHint")}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {examples.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      className="rounded px-1 py-0.5 text-left text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-foreground">
                {buildAnswerText(result, t)}
              </p>
              {missingCities.length > 0 && (
                <button
                  type="button"
                  onClick={() => missingCities.forEach((c) => addCity(c))}
                  className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {t("addToComparator")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
