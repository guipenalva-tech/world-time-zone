/**
 * Shared shell for the 4 legal pages (privacy/terms/about/contact) — plain
 * server component, no client hooks needed. There's no typography plugin
 * installed (Tailwind v4 + @tailwindcss/postcss only, no
 * @tailwindcss/typography), so long-form readability is hand-tuned here
 * instead of via a `prose` class: a capped line length (`max-w-3xl`),
 * generous vertical rhythm, and a muted-but-readable body color that
 * still passes contrast in both themes.
 */
export default function LegalArticle({
  title,
  subtitle,
  effectiveDate,
  children,
}: {
  title: string;
  subtitle: string;
  /** Omitted on pages without a meaningful "last updated" date (About, Contact). */
  effectiveDate?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-foreground/60">{subtitle}</p>
      {effectiveDate && (
        <p className="mt-1 text-xs text-foreground/40">{effectiveDate}</p>
      )}
      <div className="mt-8 space-y-8">{children}</div>
    </main>
  );
}

/** One `<h2>` + its paragraphs/list, consistently spaced. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}
