"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolveWave1CfrHref } from "@/lib/corpus/temporal";
import { LexiconText } from "./lexicon-text";

function CfrCiteChip({ rawCite }: { rawCite: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const { href: targetHref, isWave1Live: isWave1 } = resolveWave1CfrHref(rawCite);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="my-0.5 inline-flex min-h-6 items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
      >
        {rawCite}
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={`Citation preview for ${rawCite}`}
          className="absolute left-0 z-30 mt-1.5 block w-72 max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-surface-elevated p-3 text-left text-xs leading-relaxed shadow-lg"
        >
          <span className="block font-mono font-semibold text-foreground">
            {rawCite}
          </span>
          <span className="mt-1 block text-muted-foreground">
            {isWave1
              ? "Point-in-time verbatim snapshots, Federal Register effective dates, and redline diff available in Wave 1."
              : "Browse indexed point-in-time Federal Register transition intervals in the 38 C.F.R. Reader."}
          </span>
          <Link
            href={targetHref}
            className="mt-2 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
          >
            <span>{isWave1 ? `Open ${rawCite} Snapshot` : "Open 38 C.F.R. Index"}</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </span>
      )}
    </span>
  );
}

function StatuteCiteChip({ rawCite }: { rawCite: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const secDigits = /(\d{3,4})/.exec(rawCite)?.[1] ?? "";

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="my-0.5 inline-flex min-h-6 items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
      >
        {rawCite}
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={`Statutory crosswalk preview for ${rawCite}`}
          className="absolute left-0 z-30 mt-1.5 block w-72 max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-surface-elevated p-3 text-left text-xs leading-relaxed shadow-lg"
        >
          <span className="block font-mono font-semibold text-foreground">
            {rawCite}
          </span>
          <span className="mt-1 block text-muted-foreground">
            Check Era A (1933 Vet. Regs.), Era B (1959–1991 Pub. L. 85-857), and Era C
            (May/Aug. 1991) numbering in the Title 38 Statutory Crosswalk.
          </span>
          <Link
            href={secDigits ? `/crosswalk?q=${secDigits}` : "/crosswalk"}
            className="mt-2 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
          >
            <span>Inspect in Statutory Crosswalk</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </span>
      )}
    </span>
  );
}

function renderCodeSpanContent(codeText: string): ReactNode {
  if (/^(?:former\s+)?38\s*C\.F\.R\.\s*§+\s*\d+\.\d+/i.test(codeText)) {
    return <CfrCiteChip rawCite={codeText} />;
  }
  if (/^(?:former\s+)?38\s*U\.S\.C\.\s*§+\s*\d{3,4}/i.test(codeText)) {
    return <StatuteCiteChip rawCite={codeText} />;
  }
  return (
    <code className="break-words rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
      {codeText}
    </code>
  );
}

/**
 * Renders Markdown inline formatting (links, bold, italic, code spans) while
 * upgrading inline `38 C.F.R. § ...` and `38 U.S.C. § ...` citations and plain-text
 * VA/military acronyms into accessible keyboard/touch popover chips.
 */
export function InlineLegalText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const inlineTokenRe =
    /(\[[^\]]+\]\([^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  let last = 0;
  let k = 0;

  for (const m of text.matchAll(inlineTokenRe)) {
    const raw = m[0];
    const start = m.index ?? 0;
    if (start > last) {
      nodes.push(
        <LexiconText key={`txt-${k}`} text={text.slice(last, start)} />,
      );
      k += 1;
    }

    if (raw.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      const label = (linkMatch?.[1] ?? raw).replace(/`/g, "");
      const href = linkMatch?.[2] ?? "#";
      if (href.startsWith("http://") || href.startsWith("https://")) {
        nodes.push(
          <a
            key={`lnk-${k}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >
            {label} ↗
          </a>,
        );
      } else {
        nodes.push(
          <Link
            key={`lnk-${k}`}
            href={href}
            className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >
            {label}
          </Link>,
        );
      }
    } else if (raw.startsWith("***") && raw.endsWith("***")) {
      nodes.push(
        <strong key={`bi-${k}`} className="font-semibold italic text-foreground">
          <LexiconText text={raw.slice(3, -3)} />
        </strong>,
      );
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      const inner = raw.slice(2, -2);
      nodes.push(
        <strong key={`b-${k}`} className="font-semibold text-foreground">
          <InlineLegalText text={inner} />
        </strong>,
      );
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      nodes.push(
        <em key={`i-${k}`} className="italic">
          <LexiconText text={raw.slice(1, -1)} />
        </em>,
      );
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      nodes.push(
        <span key={`c-${k}`}>{renderCodeSpanContent(raw.slice(1, -1))}</span>,
      );
    }

    last = start + raw.length;
    k += 1;
  }

  if (last < text.length) {
    nodes.push(<LexiconText key={`tail-${k}`} text={text.slice(last)} />);
  }

  return <>{nodes}</>;
}
