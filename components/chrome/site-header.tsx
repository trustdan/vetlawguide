"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Landmark,
  Moon,
  Scale,
  Search,
  Shield,
  Sun,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import { cn } from "@/lib/utils";
import { ScopeCautionsDialog } from "./scope-cautions-dialog";
import { CommandSearchDialog } from "./command-search-dialog";
import { StickyEraTimelineBar } from "./sticky-era-timeline-bar";
import type { SearchEngineCatalog } from "@/lib/corpus/search-engine";

const PRIMARY_NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Eras", href: "/eras" },
  { label: "38 C.F.R.", href: "/cfr" },
  { label: "Playbooks", href: "/playbooks" },
  { label: "Cases", href: "/cases" },
  { label: "Explore", href: "/explore" },
  { label: "Investigate", href: "/investigate" },
];

export function SiteHeader({
  searchCatalog,
}: {
  searchCatalog: SearchEngineCatalog;
}) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    audienceMode,
    setAudienceMode,
    setSearchOpen,
  } = useResearchContext();

  const [cautionsOpen, setCautionsOpen] = useState(false);

  return (
    <>
      <header
        data-testid="global-site-header"
        className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
      >
        {/* Tier 1: Slim Educational Disclaimer Bar (~30px desktop, right-padded clear of GitHubCorner) */}
        <div className="border-b border-border/80 bg-surface pr-16 sm:pr-24">
          <div className="mx-auto flex min-h-7 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1 text-[11px] leading-tight text-muted-foreground sm:px-4">
            <p>
              <strong className="font-semibold text-foreground">
                Educational Reference Only
              </strong>{" "}
              — Nothing on VetLawGuide constitutes legal or medical advice or creates
              an attorney-client relationship.
            </p>
            <button
              type="button"
              onClick={() => setCautionsOpen(true)}
              className="shrink-0 font-semibold text-primary underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              [Scope &amp; CUE/Deadline Cautions]
            </button>
          </div>
        </div>

        {/* Tier 2: Brand + Zero-Flash Audience Toggle + Primary Nav + Search (~48px desktop) */}
        <div className="pr-16 sm:pr-24">
          <div className="mx-auto flex min-h-[48px] max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-1 sm:px-4">
            {/* Brand */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-serif text-base font-bold tracking-tight text-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-lg"
            >
              <Landmark className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>VetLawGuide</span>
            </Link>

            {/* Audience Mode Switch: [ Veterans | Practitioners ] */}
            <div
              role="group"
              aria-label="Audience presentation mode"
              className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-xs"
            >
              <button
                type="button"
                aria-pressed={audienceMode === "veteran"}
                onClick={() => setAudienceMode("veteran")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                  audienceMode === "veteran"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Veterans</span>
              </button>
              <button
                type="button"
                aria-pressed={audienceMode === "practitioner"}
                onClick={() => setAudienceMode("practitioner")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                  audienceMode === "practitioner"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Practitioners</span>
              </button>
            </div>

            {/* Primary Navigation + Search + Theme */}
            <nav
              aria-label="Primary research navigation"
              className="flex flex-wrap items-center gap-1"
            >
              {PRIMARY_NAV.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      isActive
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search citations, diagnostic codes, and guides (Command+K)"
                className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Search</span>
                <kbd className="hidden rounded border border-border bg-background px-1 font-mono text-[10px] sm:inline">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                aria-label="Toggle color theme"
                className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Sun
                  className="h-3.5 w-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                  aria-hidden="true"
                />
                <Moon
                  className="absolute h-3.5 w-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                  aria-hidden="true"
                />
              </button>
            </nav>
          </div>
        </div>

        {/* Tier 3: Prominent Sticky Era & Timeline Bar (Scrolls With Every Page, ADR-0006) */}
        <StickyEraTimelineBar />
      </header>

      <ScopeCautionsDialog
        open={cautionsOpen}
        onClose={() => setCautionsOpen(false)}
      />
      <CommandSearchDialog catalog={searchCatalog} />
    </>
  );
}
