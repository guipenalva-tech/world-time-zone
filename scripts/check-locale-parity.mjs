#!/usr/bin/env node
/**
 * Key-parity check across all 11 messages/*.json files: every locale must
 * have exactly the same set of leaf keys (dotted paths) as en.json (the
 * reference), with arrays and primitives both counted as leaves — this is
 * the same flattening convention used to report "342 keys" per locale
 * before this sprint. Catches missing/extra/renamed keys after adding new
 * namespaces (Footer, Consent, Privacy, Terms, About, Contact) across all
 * locales.
 * Run with: node scripts/check-locale-parity.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

function leafKeys(obj, prefix = "") {
  const out = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...leafKeys(value, dotted));
    } else {
      out.push(dotted);
    }
  }
  return out;
}

const files = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (!files.includes("en.json")) {
  console.error("en.json not found in messages/ — cannot use it as the reference locale.");
  process.exit(1);
}

const referenceLocale = "en.json";
const reference = new Set(
  leafKeys(JSON.parse(readFileSync(path.join(messagesDir, referenceLocale), "utf8"))),
);

console.log(`Reference: ${referenceLocale} (${reference.size} leaf keys)\n`);

let anyFailure = false;

for (const file of files) {
  if (file === referenceLocale) continue;
  const locale = JSON.parse(readFileSync(path.join(messagesDir, file), "utf8"));
  const keys = new Set(leafKeys(locale));

  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`OK    ${file} (${keys.size} leaf keys)`);
  } else {
    anyFailure = true;
    console.log(`FAIL  ${file} (${keys.size} leaf keys)`);
    if (missing.length > 0) {
      console.log(`  missing (${missing.length}):`);
      for (const k of missing) console.log(`    - ${k}`);
    }
    if (extra.length > 0) {
      console.log(`  extra (${extra.length}):`);
      for (const k of extra) console.log(`    + ${k}`);
    }
  }
}

console.log("");
if (anyFailure) {
  console.error("Key parity check FAILED.");
  process.exit(1);
} else {
  console.log(`Key parity check passed for all ${files.length - 1} non-reference locales.`);
}
