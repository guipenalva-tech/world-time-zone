# World Time Zone

Free time zone converter and meeting planner.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Zustand (state management)
- Luxon (time zone / date handling)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Ads setup

The bottom-of-page banner (`src/components/Ads/AdBanner.tsx`) renders a
placeholder until AdSense is configured. Once the AdSense account is
approved:

1. Copy the AdSense client ID (`ca-pub-XXXXXXXXXXXXXXXX`) from the AdSense
   dashboard.
2. Create an ad unit (Ads > By ad unit > Display ads), horizontal/responsive,
   and copy its slot ID.
3. Set `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM` in
   the Vercel project's environment variables (Production + Preview), then
   redeploy.
4. Replace the placeholder line in `public/ads.txt` with the real entry
   AdSense gives you (Sites > your domain > "View instructions"), e.g.
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.

No code changes are needed — the script tag and ad unit only render when
both env vars are present.
