"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-foreground/70">
        An unexpected error occurred. You can try again.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="rounded-full bg-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
