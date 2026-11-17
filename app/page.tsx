import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { HomeSearchLauncher } from "@/components/chrome/home-search-launcher";

interface GatewayCardSpec {
  id: string;
  title: string;
  href: string;
  prefetch?: boolean;
  illustrationSrc: string;
  veteranSentence: string;
  practitionerSentence: string;
  scopeNote?: string;
  secondaryLink?: {
    label: string;
    href: string;
  };
}

const HOME_GATEWAYS: ReadonlyArray<GatewayCardSpec> = [
  {
    id: "browse-topics",
    title: "Browse topics",
    href: "/explore",
    illustrationSrc: "/illustrations/browse-topics.webp",
    veteranSentence:
      "Explore disability ratings, older decisions, survivor benefits, and VA terms by topic.",
    practitionerSentence:
      "Navigate Title 38 authorities, review pathways, and procedural guides by subject.",
  },
  {
    id: "disability-ratings",
    title: "Disability ratings",
    href: "/vasrd",
    illustrationSrc: "/illustrations/disability-ratings.webp",
    veteranSentence:
      "Look up rating percentages and historical rule changes by body system or code.",
    practitionerSentence:
      "Inspect 38 C.F.R. Part 4 diagnostic codes (DC 5000–9918) and rating canons.",
  },
  {
    id: "investigate-decision",
    title: "Investigate a decision",
    href: "/investigate",
    prefetch: false,
    illustrationSrc: "/illustrations/investigate-decision.webp",
    veteranSentence:
      "Answer private questions on your device to list records to find and questions to ask.",
    practitionerSentence:
      "Screen historical decisions against point-in-time text, service records, and CUE limits.",
    scopeNote:
      "Covers missing records, pending appeals, rating reductions, TDIU/SMC, Nehmer, survivors, discharges, and CUE.",
  },
  {
    id: "law-and-cases",
    title: "Law and cases",
    href: "/cfr",
    illustrationSrc: "/illustrations/law-and-cases.webp",
    veteranSentence:
      "Read VA regulations as written on your decision date and compare how rules changed.",
    practitionerSentence:
      "Compare verbatim 38 C.F.R. snapshots, Federal Register effective dates, and redlines.",
    secondaryLink: {
      label: "Cases and opinions",
      href: "/cases",
    },
  },
];

const DIRECT_STARTING_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Survivor benefits", href: "/explore#survivor-benefits" },
  { label: "Missing records", href: "/cfr/38-cfr-3.156c" },
  {
    label: "Rating reductions",
    href: "/playbooks/05-void-rating-reductions-stabilized-ratings",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
      {/* 1. Headline, One-Sentence Dual-Mode Lead & 2. Prominent Search */}
      <section className="space-y-3.5">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find the VA Law in Force on Your Decision Date
          </h1>
          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Look up disability rating rules, decode older VA letters and forms, and prepare focused record checklists for an accredited VSO, claims agent, or attorney." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            Verify point-in-time <code className="font-mono text-sm">38 C.F.R.</code>{" "}
            snapshots, Federal Register effective dates, historical Title 38 citations,
            and bitemporal finality rules from primary sources.
          </p>
        </div>

        <HomeSearchLauncher />
      </section>

      {/* 3. Four Cut-Paper Illustrated Gateways */}
      <section aria-label="Primary research gateways">
        <div className="grid gap-3.5 sm:grid-cols-2">
          {HOME_GATEWAYS.map((gw) => (
            <article
              key={gw.id}
              data-testid={`gateway-card-${gw.id}`}
              className="group relative flex items-start gap-3.5 rounded-xl border border-border bg-surface-elevated p-3.5 transition-colors hover:border-primary/70 sm:gap-4 sm:p-4"
            >
              <Link
                href={gw.href}
                prefetch={gw.prefetch}
                tabIndex={-1}
                aria-hidden="true"
                className="shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs"
              >
                <Image
                  src={gw.illustrationSrc}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  className="h-18 w-18 object-cover sm:h-20 sm:w-20"
                />
              </Link>

              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="font-serif text-lg font-bold leading-snug text-foreground">
                  <Link
                    href={gw.href}
                    prefetch={gw.prefetch}
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span>{gw.title}</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </h2>

                <p
                  data-persona="veteran-only"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {gw.veteranSentence}
                </p>
                <p
                  data-persona="practitioner-only"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {gw.practitionerSentence}
                </p>

                {gw.scopeNote && (
                  <p className="pt-0.5 text-xs text-muted-foreground">
                    <LexiconText text={gw.scopeNote} />
                  </p>
                )}

                {gw.secondaryLink && (
                  <div className="pt-0.5 text-xs">
                    <Link
                      href={gw.secondaryLink.href}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span>{gw.secondaryLink.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Focused Direct-Link Row */}
      <section
        aria-label="Direct topic shortcuts"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Direct topics:
        </span>
        {DIRECT_STARTING_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>{item.label}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ))}
      </section>
    </main>
  );
}
