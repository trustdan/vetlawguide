"use client";

import { useEffect, useRef, useState } from "react";
import { BASELINE_ACRONYMS } from "@/lib/corpus/acronyms";
import type { LexiconEntry } from "@/lib/corpus/types";

const DECODER_BY_TOKEN: ReadonlyMap<string, LexiconEntry> = (() => {
  const map = new Map<string, LexiconEntry>();
  for (const item of BASELINE_ACRONYMS) {
    map.set(item.key, item);
    if (!item.key.endsWith("s") && /^[A-Z]{2,}$/.test(item.key)) {
      map.set(`${item.key}s`, item);
    }
  }
  const strs = map.get("STRs");
  if (strs) map.set("STR", strs);
  const cfile = map.get("C-file");
  if (cfile) {
    map.set("C-File", cfile);
    map.set("C-files", cfile);
  }
  const dd1380 = map.get("DD 1380");
  if (dd1380) {
    map.set("DD Form 1380", dd1380);
  }
  const dd214 = map.get("DD-214");
  if (dd214) {
    map.set("DD Form 214", dd214);
  }
  const sf180 = map.get("SF 180");
  if (sf180) {
    map.set("Standard Form 180", sf180);
  }
  return map;
})();

const TERM_REGEX =
  /\b(TDIU|SMC|NODs?|SOCs?|CUEs?|SFWs?|GSWs?|MFBs?|VASRD|RO|AOJ|BVA|CAVC|COVA|DIC|HLRs?|CRSC|VBMS|VACOLS|DFAS|DTA|ITF|JMRs?|TERAs?|VAMC|STRs?|NPRC|JSRRC|DoD|DBQs?|AMA|VJRA|VSOs?|FOIA|C-[fF]iles?|DD-214|DD Form 214|DD Form 1380|DD 1380|Standard Form 180|SF 180|SF 88|20-10206|21-0966|20-0995|21-526EZ|21-4138|8-526|10-7131)\b|(C&P|T&T)/g;

function TermPopoverChip({ token }: { token: string }) {
  const entry = DECODER_BY_TOKEN.get(token);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!entry) return <>{token}</>;

  return (
    <span ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${token}: ${entry.label} — click for plain-English definition`}
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border-b border-dashed border-primary/70 px-0.5 font-mono text-[0.92em] font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
      >
        {token}
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={entry.label}
          className="absolute left-0 z-30 mt-1.5 block w-72 max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-surface-elevated p-3 text-left text-xs leading-relaxed shadow-lg"
        >
          <span className="block font-semibold text-foreground">{entry.label}</span>
          <span className="mt-1 block text-muted-foreground">{entry.plainEnglish}</span>
          <span
            data-persona="practitioner-only"
            className="mt-1.5 block border-t border-border pt-1.5 font-mono text-[11px] text-muted-foreground"
          >
            {entry.practitionerNote}
          </span>
        </span>
      )}
    </span>
  );
}

export function LexiconText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let matchIdx = 0;

  for (const match of text.matchAll(TERM_REGEX)) {
    const full = match[0];
    const start = match.index ?? 0;
    if (start > lastIdx) {
      nodes.push(text.slice(lastIdx, start));
    }
    nodes.push(<TermPopoverChip key={`${full}-${matchIdx}`} token={full} />);
    lastIdx = start + full.length;
    matchIdx += 1;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return <>{nodes}</>;
}
