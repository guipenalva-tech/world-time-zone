"use client";

import { useEffect } from "react";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAlertsStore } from "@/stores/alertsStore";
import { readShareLinkParams } from "@/lib/shareLink";

/**
 * Invisible, app-wide bootstrap: rehydrates both persisted stores from
 * localStorage, applies a share-link (if present in the URL) or seeds the
 * default cities. Mounted once in the root layout so every route (not just
 * the comparator home) sees hydrated, shared state.
 */
export default function StoreHydrator() {
  useEffect(() => {
    async function init() {
      await useComparatorStore.persist.rehydrate();
      await useSettingsStore.persist.rehydrate();
      await useAlertsStore.persist.rehydrate();

      const shareParams = readShareLinkParams();
      if (shareParams) {
        useComparatorStore
          .getState()
          .hydrateFromShareLink(shareParams.cityIds, shareParams.start, shareParams.end);
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        useComparatorStore.getState().initializeDefaultCities();
      }
    }
    init();
  }, []);

  return null;
}
