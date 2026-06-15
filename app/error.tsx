"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-surface px-6 text-center">
      <div className="text-5xl">🧹</div>
      <h1 className="mt-4 font-display text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-soft">
        Sorry, we hit a snag. Please try again, or head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary px-6">Try again</button>
        <Link href="/" className="btn-ghost px-6">Go home</Link>
      </div>
    </div>
  );
}
