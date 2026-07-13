/**
 * Tiny Node module-customization hook (see node:module `register`), used
 * only by the scripts/check-*.mjs validation scripts.
 *
 * Why this exists: our src/lib/*.ts files import each other with
 * extensionless specifiers (e.g. `from "./solar"`), which is required by
 * the project's tsconfig ("moduleResolution": "bundler", matching what
 * Next.js's bundler resolves at build time) — TypeScript in that mode
 * rejects explicit ".ts" extensions outright ("An import path can only
 * end with a '.ts' extension when 'allowImportingTsExtensions' is
 * enabled"). Node's own --experimental-strip-types runtime, however, does
 * strict ESM resolution and never guesses extensions. This hook bridges
 * that one gap for standalone script runs: if a relative specifier
 * doesn't resolve as-is, retry it with ".ts" appended.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExtension = /\.[a-zA-Z]+$/.test(specifier);
    if (err?.code === "ERR_MODULE_NOT_FOUND" && isRelative && !hasExtension) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
