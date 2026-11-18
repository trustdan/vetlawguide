"use client";

import Link from "next/link";
import "./globals.css";

const GLOBAL_RECOVERY_LINKS: ReadonlyArray<{ title: string; href: string }> = [
  { title: "Browse topics", href: "/explore" },
  { title: "Disability ratings", href: "/vasrd" },
  { title: "Investigate a decision", href: "/investigate" },
  { title: "Law and cases", href: "/cfr" },
];

export default function GlobalErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-14">
          <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-6">
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              VetLawGuide · Recovery
            </p>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Something went wrong loading this page
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Try reloading below, or return to the home page or one of the main
              sections. No private screening answers are sent over the network.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                data-testid="global-error-retry-button"
                onClick={() => reset()}
                className="inline-flex min-h-9 items-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Try again
              </button>
              <Link
                href="/"
                prefetch={false}
                className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Return to home page
              </Link>
            </div>
          </div>

          <nav aria-label="Main research gateways" className="grid gap-3 sm:grid-cols-2">
            {GLOBAL_RECOVERY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="rounded-lg border border-border bg-surface p-3.5 text-sm font-semibold text-primary underline underline-offset-2 hover:bg-muted"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </main>
      </body>
    </html>
  );
}
