import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        World Time Zone
      </h1>
      <p className="max-w-xl text-lg text-foreground/70">
        Compare time zones across the world and find the best time to meet,
        wherever your team is.
      </p>
      <Link
        href="/compare"
        className="rounded-full bg-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        Start comparing
      </Link>
    </main>
  );
}
