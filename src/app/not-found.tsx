import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">404 — Page not found</h1>
      <p className="max-w-md text-foreground/70">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-primary underline">
        Back to home
      </Link>
    </main>
  );
}
