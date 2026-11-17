"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  Menu,
  Moon,
  Scale,
  Search,
  Shield,
  Sun,
  X,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import { cn } from "@/lib/utils";
import { ScopeCautionsDialog } from "./scope-cautions-dialog";
import { CommandSearchDialog } from "./command-search-dialog";
import { StickyEraTimelineBar } from "./sticky-era-timeline-bar";
import type { SearchEngineCatalog } from "@/lib/corpus/search-engine";

const PRIMARY_NAV: ReadonlyArray<{
  label: string;
  href: string;
  matchPrefixes: readonly string[];
  prefetch?: boolean;
}> = [
  { label: "Browse", href: "/explore", matchPrefixes: ["/explore"] },
  { label: "Ratings", href: "/vasrd", matchPrefixes: ["/vasrd"] },
  {
    label: "Investigate",
    href: "/investigate",
    matchPrefixes: ["/investigate"],
    prefetch: false,
  },
  { label: "Law", href: "/cfr", matchPrefixes: ["/cfr"] },
  {
    label: "Guides",
    href: "/playbooks",
    matchPrefixes: ["/playbooks", "/docs", "/checklists"],
  },
];

const REFERENCE_MENU_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  detail: string;
}> = [
  {
    label: "Law timeline",
    href: "/timeline",
    detail: "Four-track 1945–2026 chronology and quarantined rulemaking watchlist",
  },
  {
    label: "Cases and opinions",
    href: "/cases",
    detail: "Supreme Court, Federal Circuit, CAVC, and VA General Counsel opinions",
  },
  {
    label: "Historical eras",
    href: "/eras",
    detail: "Five adjudication eras (1945–Present), definitions, and matrix",
  },
  {
    label: "Statutory crosswalk",
    href: "/crosswalk",
    detail: "1933 ↔ 1958 ↔ 1991 Title 38 section renumbering lookup",
  },
  {
    label: "Forms decoder",
    href: "/reference/forms-and-codes",
    detail: "Legacy VA/military forms, rating code sheets, and acronyms",
  },
  {
    label: "Checklists",
    href: "/checklists",
    detail: "Pre-filing verification worksheets and Board CUE gates",
  },
  {
    label: "Legal treatises",
    href: "/docs",
    detail: "In-depth substantive and procedural reference chapters",
  },
];

function FolioWordmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
      fill="none"
    >
      <rect width="24" height="24" rx="5" className="fill-foreground" />
      <path
        d="M5 5.5C7.4 5.1 10 5.3 12 6.2V18.4C10 17.5 7.4 17.3 5 17.7V5.5Z"
        className="fill-background"
      />
      <path
        d="M19 5.5C16.6 5.1 14 5.3 12 6.2V18.4C14 17.5 16.6 17.3 19 17.7V5.5Z"
        className="fill-background"
      />
      <rect x="14.5" y="13" width="6" height="5.5" rx="1" className="fill-accent" />
    </svg>
  );
}

export function SiteHeader({
  searchCatalog,
}: {
  searchCatalog: SearchEngineCatalog;
}) {
  const pathname = usePathname() ?? "/";
  const { resolvedTheme, setTheme } = useTheme();
  const { audienceMode, setAudienceMode, setSearchOpen } = useResearchContext();

  const [cautionsOpen, setCautionsOpen] = useState(false);
  const [referenceOpenPath, setReferenceOpenPath] = useState<string | null>(null);
  const [mobileMenuOpenPath, setMobileMenuOpenPath] = useState<string | null>(null);
  const refMenuContainer = useRef<HTMLDivElement | null>(null);

  const referenceOpen = referenceOpenPath === pathname;
  const mobileMenuOpen = mobileMenuOpenPath === pathname;

  const isReferenceActive =
    pathname.startsWith("/timeline") ||
    pathname.startsWith("/cases") ||
    pathname.startsWith("/eras") ||
    pathname.startsWith("/crosswalk") ||
    pathname.startsWith("/reference");

  useEffect(() => {
    if (!referenceOpen && !mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReferenceOpenPath(null);
        setMobileMenuOpenPath(null);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (
        referenceOpen &&
        refMenuContainer.current &&
        !refMenuContainer.current.contains(e.target as Node)
      ) {
        setReferenceOpenPath(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [referenceOpen, mobileMenuOpen]);

  return (
    <>
      <header
        data-testid="global-site-header"
        className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
      >
        {/* Tier 1: Shortened Educational Disclaimer Bar (right-padded clear of diagonal Octocat corner) */}
        <div className="border-b border-border/80 bg-surface pr-12 sm:pr-20 md:pr-24">
          <div className="mx-auto flex min-h-6 max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-2 py-0.5 text-xs leading-tight text-muted-foreground sm:min-h-7 sm:px-4 sm:py-1">
            <p className="font-medium text-foreground">
              <span className="sm:hidden">Educational reference · </span>
              <span className="hidden sm:inline">Educational reference only. </span>
              <span className="font-normal text-muted-foreground">
                Not legal advice.
              </span>
            </p>
            <button
              type="button"
              aria-label="Scope & CUE/Deadline Cautions"
              onClick={() => setCautionsOpen(true)}
              className="shrink-0 font-semibold text-primary underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="sm:hidden">Cautions</span>
              <span className="hidden sm:inline">
                Scope &amp; CUE/Deadline Cautions
              </span>
            </button>
          </div>
        </div>

        {/* Tier 2: Wordmark + Zero-Flash Audience Switch + Visitor-Question Nav + Search */}
        <div className="pr-5 sm:pr-16 md:pr-20">
          <div className="mx-auto flex min-h-8 max-w-6xl flex-wrap items-center justify-between gap-x-1 gap-y-0.5 px-1.5 py-0.5 sm:min-h-[46px] sm:gap-x-2 sm:px-4 sm:py-1">
            {/* Wordmark */}
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-serif text-sm font-bold tracking-tight text-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-2 sm:text-lg"
            >
              <FolioWordmarkIcon />
              <span>VetLawGuide</span>
            </Link>

            {/* Audience Mode Switch: [ Veterans | Practitioners ] */}
            <div
              role="group"
              aria-label="Audience presentation mode"
              className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-xs leading-none"
            >
              <button
                type="button"
                aria-pressed={audienceMode === "veteran"}
                onClick={() => setAudienceMode("veteran")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary sm:px-2.5",
                  audienceMode === "veteran"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shield className="hidden h-3.5 w-3.5 sm:inline" aria-hidden="true" />
                <span>Veterans</span>
              </button>
              <button
                type="button"
                aria-pressed={audienceMode === "practitioner"}
                onClick={() => setAudienceMode("practitioner")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary sm:px-2.5",
                  audienceMode === "practitioner"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Scale className="hidden h-3.5 w-3.5 sm:inline" aria-hidden="true" />
                <span>Practitioners</span>
              </button>
            </div>

            {/* Desktop Visitor-Question Navigation + Search + Mobile Menu Trigger */}
            <div className="flex items-center gap-1">
              <nav
                aria-label="Primary research navigation"
                className="hidden items-center gap-0.5 lg:flex"
              >
                {PRIMARY_NAV.map((item) => {
                  const isActive = item.matchPrefixes.some(
                    (prefix) =>
                      pathname === prefix || pathname.startsWith(`${prefix}/`),
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={item.prefetch}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                        isActive
                          ? "bg-muted font-semibold text-primary"
                          : "text-muted-foreground hover:bg-surface hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {/* Reference Dropdown */}
                <div ref={refMenuContainer} className="relative">
                  <button
                    type="button"
                    aria-expanded={referenceOpen}
                    aria-controls="header-reference-panel"
                    onClick={() =>
                      setReferenceOpenPath((prev) =>
                        prev === pathname ? null : pathname,
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      isReferenceActive || referenceOpen
                        ? "bg-muted font-semibold text-primary"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <span>Reference</span>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  {referenceOpen && (
                    <div
                      id="header-reference-panel"
                      role="region"
                      aria-label="Reference tools and directories"
                      className="absolute right-0 mt-1.5 w-72 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-lg"
                    >
                      {REFERENCE_MENU_ITEMS.map((refItem) => (
                        <Link
                          key={refItem.href}
                          href={refItem.href}
                          onClick={() => setReferenceOpenPath(null)}
                          className="block rounded-md px-3 py-2 text-xs transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <div className="font-semibold text-foreground">
                            {refItem.label}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {refItem.detail}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </nav>

              {/* Search Button (Visible on all screen sizes) */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search citations, diagnostic codes, and guides (Command+K)"
                className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-surface px-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary sm:h-7 sm:px-2.5"
              >
                <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">Search</span>
                <kbd className="hidden rounded border border-border bg-background px-1 font-mono text-xs md:inline">
                  ⌘K
                </kbd>
              </button>

              {/* Desktop Theme Toggle */}
              <button
                type="button"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                aria-label="Toggle color theme"
                className="hidden h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary lg:inline-flex"
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

              {/* Mobile Navigation Menu Trigger */}
              <button
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-primary-nav-sheet"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() =>
                  setMobileMenuOpenPath((prev) =>
                    prev === pathname ? null : pathname,
                  )
                }
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface px-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary sm:h-7 sm:px-2 lg:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Menu className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Sheet (<lg) */}
        {mobileMenuOpen && (
          <nav
            id="mobile-primary-nav-sheet"
            aria-label="Mobile research navigation"
            className="border-t border-border bg-surface-elevated px-3 py-3 lg:hidden"
          >
            <div className="mx-auto max-w-6xl space-y-3">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {PRIMARY_NAV.map((item) => {
                  const isActive = item.matchPrefixes.some(
                    (prefix) =>
                      pathname === prefix || pathname.startsWith(`${prefix}/`),
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={item.prefetch}
                      onClick={() => setMobileMenuOpenPath(null)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs font-semibold",
                        isActive
                          ? "border-primary bg-muted text-primary"
                          : "border-border bg-background text-foreground hover:bg-surface",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-border/80 pt-2">
                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Reference tools
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {REFERENCE_MENU_ITEMS.map((refItem) => (
                    <Link
                      key={refItem.href}
                      href={refItem.href}
                      onClick={() => setMobileMenuOpenPath(null)}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-surface"
                    >
                      {refItem.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/80 pt-2">
                <span className="text-xs text-muted-foreground">Appearance</span>
                <button
                  type="button"
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <Sun className="h-3.5 w-3.5 dark:hidden" aria-hidden="true" />
                  <Moon className="hidden h-3.5 w-3.5 dark:inline" aria-hidden="true" />
                  <span>Toggle light / dark theme</span>
                </button>
              </div>
            </div>
          </nav>
        )}

        {/* Tier 3: Responsive Era & Decision Date Bar (Chip on narrow screens & gateways; inline ribbon on lg+ temporal routes) */}
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
