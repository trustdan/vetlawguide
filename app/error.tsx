"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { HomeSearchLauncher } from "@/components/chrome/home-search-launcher";

const ERROR_GATEWAYS: ReadonlyArray<{
  title: string;
  href: string;
  prefetch?: boolean;
  description: string;
}> = [
  {
    title: "Browse topics",
    href: "/explore",
    description:
      "Explore disability ratings, older decisions, survivor benefits, and VA terms.",
  },
  {
    title: "Disability ratings",
    href: "/vasrd",
    description:
      "Look up rating percentages and historical changes by body system or code.",
  },
  {
    title: "Investigate a decision",
    href: "/investigate",
    prefetch: false,
    description:
      "Answer private on-device questions to list records to find and questions to ask.",
  },
  {
    title: "Law and cases",
    href: "/cfr",
    description:
      "Read 38 C.F.R. regulations as written on your decision date and compare changes.",
  },
];

export default function RouteErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:py-14">
      <header className="space-y-3 border-b border-border pb-5">
        <p className="font-mono text-xs font-semibold text-muted-foreground">
          Page Display Error
        </p>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
          Something went wrong loading this page
        </h1>
        <p className="editorial-prose text-muted-foreground">
          Try reloading this view below, or search for the regulation, Diagnostic
          Code, or guide you need. Any private screening answers stay strictly on
          your device.
        </p>
        <div className="pt-1">
          <button
            type="button"
            data-testid="error-retry-button"
            onClick={() => reset()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Try again</span>
          </button>
        </div>
      </header>

      <section aria-label="Search the reference desk">
        <HomeSearchLauncher />
      </section>

      <section aria-label="Primary research gateways" className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-foreground">
          Main research gateways
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ERROR_GATEWAYS.map((gw) => (
            <Link
              key={gw.href}
              href={gw.href}
              prefetch={gw.prefetch}
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface-elevated p-4 transition-colors hover:border-primary/70 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-serif text-base font-bold text-foreground group-hover:text-primary">
                  <span>{gw.title}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {gw.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
