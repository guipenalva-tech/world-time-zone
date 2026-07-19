import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ConsentStatus = "unknown" | "accepted" | "rejected";

interface ConsentState {
  /** The user's cookie choice. "unknown" until they pick one of the two
   * equally-weighted banner buttons — this is also the only state in
   * which the banner shows unprompted (see `bannerOpen` below). */
  status: ConsentStatus;
  /** True once zustand persist has finished reading localStorage
   * (client-only) — gates rendering so SSR/CSR never mismatch and the
   * banner never flashes before we know the real stored choice. */
  hasHydrated: boolean;
  /** Not persisted: set by the footer's "Cookie preferences" link to
   * reopen the banner on demand even after a choice was already made. */
  bannerOpen: boolean;

  acceptAll: () => void;
  rejectNonEssential: () => void;
  openPreferences: () => void;
  setHasHydrated: (value: boolean) => void;
}

/**
 * Cookie-consent gate for AdSense (LGPD/GDPR). This is the single source
 * of truth `AdBanner` and the AdSense script loader read from — the
 * AdSense script/unit must never load before `status === "accepted"`.
 *
 * Note: once the AdSense account is approved, Google's own Funding
 * Choices / consent management platform (CMP) could replace this
 * hand-rolled banner + store entirely — it integrates directly with
 * AdSense and handles regional consent signals (TCF, US state laws,
 * etc.) out of the box. If that's adopted later, this store and
 * `src/components/Consent` can be removed and `AdBanner` switched to
 * read whatever signal the Google CMP exposes instead.
 */
export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      status: "unknown",
      hasHydrated: false,
      bannerOpen: false,

      acceptAll: () => set({ status: "accepted", bannerOpen: false }),
      rejectNonEssential: () => set({ status: "rejected", bannerOpen: false }),
      openPreferences: () => set({ bannerOpen: true }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wtz-consent",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ status: state.status }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
