import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. This still
 * runs before every non-static route: it detects the visitor's preferred
 * locale from `Accept-Language` (falling back to `en`) and redirects `/` to
 * `/<locale>`, while preserving the path and query string for already
 * locale-prefixed URLs (e.g. `/pt?cities=...`).
 */
export function proxy(request: Parameters<typeof handleI18nRouting>[0]) {
  return handleI18nRouting(request);
}

export const config = {
  // Skip API routes, Next internals, and files with an extension (e.g. favicon.ico).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
