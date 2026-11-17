import { matchesDiagnosticCode, normalizeCfrSlug } from "./temporal";
import type {
  CompiledCfrSection,
  CoverageManifest,
  DocumentCategory,
  ExplainableSearchMatch,
  LexiconEntry,
  SearchableItem,
  StatutoryCrosswalkEntry,
} from "./types";

const CATEGORY_LABELS: Readonly<Record<DocumentCategory, string>> = {
  "authority-snapshot": "Verbatim CFR Snapshot",
  "cfr-diff": "Historical CFR Redline",
  playbook: "Investigation Playbook",
  checklist: "Pre-Filing Gate Checklist",
  doctrine: "Legal Doctrine Reference",
  "era-lens": "Historical Era Lens",
};

export interface SearchEngineCatalog {
  manifest: CoverageManifest;
  cfrSections: CompiledCfrSection[];
  crosswalk: StatutoryCrosswalkEntry[];
  lexicon: LexiconEntry[];
}

export function buildSearchableCatalog(catalog: SearchEngineCatalog): SearchableItem[] {
  const items: SearchableItem[] = [];

  items.push({
    id: "hub-vasrd",
    title: "15-System VASRD Rating Schedule & Subpart A Policy Directory",
    subtitle: "Browse all 15 38 C.F.R. Part 4 body systems (DC 5000–9918) plus §§ 4.1–4.31 general rating policy",
    href: "/vasrd",
    group: "Verbatim 38 C.F.R. & VASRD Hubs",
    keywords: "vasrd body systems rating schedule part 4 diagnostic codes directory",
  });

  for (const sys of catalog.manifest.vasrdSystems) {
    items.push({
      id: `vasrd-${sys.systemId}`,
      title: `VASRD Hub: ${sys.label}`,
      subtitle: `${sys.diagnosticCodeRange} · ${sys.moduleIds.length} verified regulatory & comparison modules`,
      href: `/vasrd/${sys.systemId}`,
      group: "Verbatim 38 C.F.R. & VASRD Hubs",
      keywords: `${sys.label} ${sys.diagnosticCodeRange} ${sys.systemId} vasrd schedule`,
      diagnosticCodes: sys.diagnosticCodeRange.match(/\d{4}\s*[-–]\s*\d{4}|\d{4}/g)?.map((s) => s.replace(/\s+/g, "").replace("–", "-")) ?? [],
    });
  }

  for (const mod of catalog.manifest.modules) {
    const group: SearchableItem["group"] =
      mod.category === "authority-snapshot" || mod.category === "cfr-diff"
        ? "Verbatim 38 C.F.R. & VASRD Hubs"
        : mod.category === "era-lens"
          ? "Lexicon, Crosswalk & Era Lenses"
          : "Playbooks, Treatises & Checklists";

    items.push({
      id: `mod-${mod.id}`,
      title: mod.title,
      subtitle: `${CATEGORY_LABELS[mod.category]} · ${mod.cfrCitations.slice(0, 2).join(", ") || "Primary-Source Reference"}`,
      href: mod.canonicalRoute,
      group,
      keywords: [
        ...mod.diagnosticCodes,
        ...mod.cfrCitations,
        ...mod.statutes,
        ...mod.practiceDomains,
      ].join(" "),
      diagnosticCodes: mod.diagnosticCodes,
      cfrCitations: mod.cfrCitations,
      statutes: mod.statutes,
    });
  }

  for (const sec of catalog.cfrSections) {
    if (sec.bookmarkStatus === "WAVE_1_LIVE_VERBATIM") continue;
    items.push({
      id: `cfr-${sec.sectionSlug}`,
      title: `${sec.cfrSection} — ${sec.title}`,
      subtitle:
        sec.bookmarkStatus === "QUARANTINED_NONBINDING"
          ? "Quarantined Watchlist — Proposed or Rescinded (Not Enacted)"
          : `${sec.versions.length} Effective-Date Snapshot(s) · Linked Verbatim Authority`,
      href: `/cfr/${sec.sectionSlug}`,
      group: "Verbatim 38 C.F.R. & VASRD Hubs",
      keywords: `${sec.cfrSection} ${sec.sectionSlug} ${sec.summary} ${sec.diagnosticCodes.join(" ")}`,
      cfrCitations: [sec.cfrSection],
      diagnosticCodes: sec.diagnosticCodes,
    });
  }

  // Dedicated Timeline, Piercing-Finality Flowchart, Crosswalk, Era Lenses & Forms/Codes hubs
  items.push({
    id: "hub-timeline",
    title: "Multi-Track Interactive Law Timeline & Quarantined Rulemaking Watchlist (1945–2026)",
    subtitle:
      "Statutes · Part 3 Adjudication · Part 4 VASRD · Landmark Precedents + proposed/unfinalized/rescinded watchlist",
    href: "/timeline",
    group: "Lexicon, Crosswalk & Era Lenses",
    keywords:
      "timeline chronology 4-track statutes part 3 vasrd precedents proposed unfinalized rescinded not enacted quarantined watchlist 2900-AQ72 2900-AQ73 2900-AQ82 2900-AR96 2900-AS39 90 FR 46542 91 FR 7118",
  });

  items.push({
    id: "hub-piercing-finality-flowchart",
    title: "Interactive Piercing-Finality Decision Flowchart & 1:1 Accessible Outline",
    subtitle:
      "6-gate visual sequence: Void Reduction -> § 3.156(c) -> Pending/Beraud/Lang/Hamill -> Nehmer -> RO CUE -> Board CUE",
    href: "/explore/piercing-finality",
    group: "Playbooks, Treatises & Checklists",
    keywords:
      "piercing finality flowchart diagram outline void reduction 3.344 3.156c beraud lang hamill nehmer ro cue board cue 20.1409c",
  });

  items.push({
    id: "hub-eras",
    title: "Five Historical Veterans Law Era Lenses (1945–2026)",
    subtitle: "Post-WWII 1945 VASRD · 1958 Title 38 · 1988 VJRA & CAVC · 2000 VCAA · 2019 AMA & 2022 PACT Act",
    href: "/eras",
    group: "Lexicon, Crosswalk & Era Lenses",
    keywords: "era lenses historical decades 1945 1958 1988 vjra 2000 vcaa 2019 ama pact act chronology",
  });

  items.push({
    id: "hub-crosswalk",
    title: "Interactive Three-Era Title 38 Statutory Crosswalk (1933 ↔ 1958 ↔ 1991)",
    subtitle: "Translate Vet. Reg. No. 1(a), former §§ 211(a), 310, 314, 355, 3010, 4004 ↔ modern 38 U.S.C.",
    href: "/crosswalk",
    group: "Lexicon, Crosswalk & Era Lenses",
    keywords: catalog.crosswalk
      .map((r) => `${r.eraAAuthority} ${r.eraBSection} ${r.eraCSection} ${r.subject}`)
      .join(" "),
  });

  for (const term of catalog.lexicon) {
    items.push({
      id: `lex-${term.key}`,
      title: term.label,
      subtitle: term.plainEnglish,
      href: `/reference/forms-and-codes?q=${encodeURIComponent(term.key)}`,
      group: "Lexicon, Crosswalk & Era Lenses",
      keywords: `${term.key} ${term.kind} ${term.practitionerNote}`,
      formKeys: [term.key],
    });
  }

  return items;
}

/**
 * Deterministic + Explainable Search Engine (E3-S2):
 * Evaluates exact 4-digit VASRD Diagnostic Codes (including hyphenated ranges),
 * former/modern Title 38 U.S.C. statutory crosswalk sections, 38 C.F.R. sections,
 * historical VA/military form numbers, and multi-token full-text scoring.
 */
export function executeExplainableSearch(
  rawQuery: string,
  catalog: SearchEngineCatalog,
): ExplainableSearchMatch[] {
  const items = buildSearchableCatalog(catalog);
  const q = rawQuery.trim();

  if (!q) {
    return items.slice(0, 18).map((item, idx) => ({
      item,
      score: 100 - idx,
      matchKind: "keyword",
      matchReason:
        item.group === "Verbatim 38 C.F.R. & VASRD Hubs"
          ? "Point-in-time regulatory snapshot & VASRD body-system hub"
          : item.group === "Lexicon, Crosswalk & Era Lenses"
            ? "Reference decoder, statutory crosswalk & era lens"
            : "Verified playbook, doctrine treatise & pre-filing checklist",
    }));
  }

  const results: ExplainableSearchMatch[] = [];
  const seenIds = new Set<string>();

  // 1. Deterministic 4-digit Diagnostic Code Matcher (e.g., "5313", "DC 5313", "7804", "7399-7346")
  const dcMatch = /^(?:dc\s*)?(\d{4})(?:\s*[-–]\s*(\d{4}))?$/i.exec(q);
  if (dcMatch) {
    const targetDc = dcMatch[2] ?? dcMatch[1]!;
    const isAnalogousPrefix = Boolean(dcMatch[2] && dcMatch[1]?.endsWith("99"));

    for (const item of items) {
      for (const spec of item.diagnosticCodes ?? []) {
        if (matchesDiagnosticCode(spec, targetDc)) {
          seenIds.add(item.id);
          const isExactDc = spec === targetDc;
          const isBroadVasrdHub = item.id.startsWith("vasrd-");
          results.push({
            item,
            score: isExactDc ? 1020 : isBroadVasrdHub ? 970 : 1000,
            matchKind: "deterministic-dc",
            matchReason: isExactDc
              ? `Exact Diagnostic Code ${targetDc} match`
              : `Diagnostic Code ${targetDc} falls inside indexed range DC ${spec}`,
          });
          break;
        }
      }
    }

    if (isAnalogousPrefix) {
      const formsHub = items.find((i) => i.id.startsWith("lex-"));
      if (formsHub && !seenIds.has("hub-analogous")) {
        results.push({
          item: {
            id: "hub-analogous",
            title: `Analogous Diagnostic Code ${q} (38 C.F.R. § 4.20)`,
            subtitle: `Code ending in '99' indicates an unlisted condition rated by analogy to DC ${targetDc}`,
            href: `/reference/forms-and-codes?q=${encodeURIComponent(q)}`,
            group: "Lexicon, Crosswalk & Era Lenses",
            keywords: q,
          },
          score: 980,
          matchKind: "deterministic-dc",
          matchReason: `Decoded xx99-xxxx analogous rating notation (${dcMatch[1]} → rated by analogy to DC ${targetDc})`,
        });
      }
    }
  }

  // 2. Deterministic Statutory Crosswalk Matcher ("former 38 U.S.C. § 3010", "§ 355", "Vet. Reg. 1(a)", "211(a)")
  const statuteSecMatch =
    /(?:former\s+)?(?:38\s*U\.?S\.?C\.?\s*)?(?:§+|sec\.?|section)\s*(\d{3,4}(?:\([a-z0-9]+\))?)/i.exec(
      q,
    ) ??
    (/^(?:211\(a\)|310|314|351|354|355|359|410|418|3001|3010|3012|3021|3103|3404|4004|4005)$/i.test(
      q,
    )
      ? [q, q]
      : null);

  if (statuteSecMatch || /vet\.?\s*reg/i.test(q)) {
    const secToken = statuteSecMatch?.[1]?.replace(/\([^)]*\)/g, "") ?? "";
    const matchingRows = catalog.crosswalk
      .filter((row) => {
        if (/vet\.?\s*reg/i.test(q)) {
          return row.eraAAuthority.toLowerCase().includes("vet. reg");
        }
        if (!secToken) return false;
        const tokenRe = new RegExp(`\\b${secToken}\\b`, "i");
        return (
          tokenRe.test(row.eraBSection) ||
          tokenRe.test(row.eraCSection) ||
          tokenRe.test(row.subject)
        );
      })
      .sort((a, b) => {
        // Prioritize Table 3.C exact section-by-section mappings ("§ 5110...") over multi-section range blocks
        const aExact = /^§\s*\d/.test(a.eraCSection) ? 0 : 1;
        const bExact = /^§\s*\d/.test(b.eraCSection) ? 0 : 1;
        return aExact - bExact;
      });

    if (matchingRows.length > 0) {
      const topRow = matchingRows[0]!;
      const crosswalkHub = items.find((i) => i.id === "hub-crosswalk");
      if (crosswalkHub && !seenIds.has(crosswalkHub.id)) {
        seenIds.add(crosswalkHub.id);
        results.push({
          item: {
            ...crosswalkHub,
            href: `/crosswalk?q=${encodeURIComponent(secToken || q)}`,
          },
          score: 960,
          matchKind: "deterministic-statute",
          matchReason: `Statutory Crosswalk: Era B ${topRow.eraBSection} ↔ Modern ${topRow.eraCSection} (${topRow.subject})`,
        });
      }

      // Surface Wave 1 modules citing the translated modern section
      const modernDigits = /(\d{3,4})/.exec(topRow.eraCSection)?.[1];
      if (modernDigits) {
        for (const item of items) {
          if (seenIds.has(item.id)) continue;
          if (
            (item.statutes ?? []).some((s) =>
              new RegExp(`\\b${modernDigits}\\b`).test(s),
            )
          ) {
            seenIds.add(item.id);
            const isPrimaryCfrEntity = /^\/cfr\/38-cfr-/.test(item.href);
            results.push({
              item,
              score: isPrimaryCfrEntity ? 945 : 930,
              matchKind: "deterministic-statute",
              matchReason: `Cites translated modern authority 38 U.S.C. § ${modernDigits} (formerly ${topRow.eraBSection})`,
            });
          }
        }
      }
    }
  }

  // 3. Deterministic 38 C.F.R. Section Matcher ("4.56", "38 C.F.R. § 3.156(c)", "14.636", "1.963")
  if (/(?:38\s*c\.?f\.?r\.?|\b(?:1|3|4|14|17|19|20|21|71))\.\d+/i.test(q)) {
    const targetSlug = normalizeCfrSlug(q);
    for (const item of items) {
      if (seenIds.has(item.id)) continue;
      const citesMatch = (item.cfrCitations ?? []).some(
        (c) => normalizeCfrSlug(c) === targetSlug || c.toLowerCase().includes(q.toLowerCase()),
      );
      if (citesMatch || item.href.includes(targetSlug)) {
        seenIds.add(item.id);
        results.push({
          item,
          score: item.href.startsWith(`/cfr/${targetSlug}`) ? 990 : 910,
          matchKind: "deterministic-cfr",
          matchReason: `Matched 38 C.F.R. citation (${targetSlug.replace("38-cfr-", "§ ")})`,
        });
      }
    }
  }

  // 4. Deterministic Legacy & Modern Form / Acronym Matcher ("8-526", "10-7131", "DD 1380", "21-4138")
  const normFormQ = q.toLowerCase().replace(/^va\s+form\s+/i, "").trim();
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    const matchedKey = (item.formKeys ?? []).find(
      (fk) =>
        fk.toLowerCase() === normFormQ ||
        fk.toLowerCase().includes(normFormQ) ||
        normFormQ.includes(fk.toLowerCase()),
    );
    if (matchedKey && normFormQ.length >= 2) {
      seenIds.add(item.id);
      results.push({
        item,
        score: 950,
        matchKind: "deterministic-form",
        matchReason: `Matched VA / military form or code-sheet term "${matchedKey}"`,
      });
    }
  }

  // 5. Tokenized Keyword Scoring Across Remaining Catalog
  const queryTokens = q
    .toLowerCase()
    .split(/[^a-z0-9&.§-]+/)
    .filter((t) => t.length >= 2);

  if (queryTokens.length > 0) {
    for (const item of items) {
      if (seenIds.has(item.id)) continue;
      const haystack = `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase();
      let matchedCount = 0;
      const matchedWords: string[] = [];

      for (const tok of queryTokens) {
        if (haystack.includes(tok)) {
          matchedCount += 1;
          matchedWords.push(tok);
        }
      }

      if (matchedCount > 0) {
        const ratio = matchedCount / queryTokens.length;
        const titleBoost = queryTokens.some((t) =>
          item.title.toLowerCase().includes(t),
        )
          ? 40
          : 0;
        const liveBoost =
          item.group === "Verbatim 38 C.F.R. & VASRD Hubs" ? 25 : 15;
        results.push({
          item,
          score: Math.round(ratio * 500) + titleBoost + liveBoost,
          matchKind: "keyword",
          matchReason: `Matched terms: ${matchedWords.join(", ")}`,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 24);
}
