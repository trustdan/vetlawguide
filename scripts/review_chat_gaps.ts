/**
 * Monthly Content-Gap Review Helper (`pnpm chat:gaps`).
 *
 * Summarizes recent PII-scrubbed `public.chat_questions` rows (`has_corpus_gap = true`,
 * `retrieved_count <= 1`, unmatched 4-digit Diagnostic Codes, and unfamiliar uppercase
 * acronyms) to feed upstream `VA-law-planning` module requests and lexicon additions.
 */
import { createClient } from "@supabase/supabase-js";
import { getCompiledCfrSections, getCompiledLexicon, getCoverageManifest } from "../lib/corpus/loader";

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.log(
      "[chat:gaps] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in local env. Set them (or run the SQL query in docs/launch/POST_CODE_LAUNCH_AND_OPS_GUIDE.md) to review monthly chat content gaps.",
    );
    return;
  }

  const days = Number(process.env.CHAT_GAP_WINDOW_DAYS ?? "30");
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("chat_questions")
    .select("question, audience_mode, active_decision_date, top_route, retrieved_count, has_corpus_gap, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error(`[chat:gaps] Supabase query failed: ${error.message}`);
    process.exit(1);
  }

  const rows = data ?? [];
  const gapRows = rows.filter((r) => r.has_corpus_gap || (r.retrieved_count ?? 0) <= 1);

  const manifest = getCoverageManifest();
  const indexedDcs = new Set<string>([
    ...manifest.modules.flatMap((m) => m.diagnosticCodes),
    ...getCompiledCfrSections().flatMap((s) => s.diagnosticCodes),
  ]);
  const knownLexiconKeys = new Set(
    getCompiledLexicon().map((e) => e.key.toUpperCase()),
  );

  const unmatchedDcCounts = new Map<string, number>();
  const unfamiliarAcronyms = new Map<string, number>();

  for (const r of rows) {
    const q = String(r.question ?? "");
    for (const m of q.matchAll(/\b([5-9]\d{3})\b/g)) {
      const dc = m[1]!;
      if (!indexedDcs.has(dc)) {
        unmatchedDcCounts.set(dc, (unmatchedDcCounts.get(dc) ?? 0) + 1);
      }
    }
    for (const m of q.matchAll(/\b([A-Z]{3,8})\b/g)) {
      const tok = m[1]!;
      if (!knownLexiconKeys.has(tok) && tok !== "CFR" && tok !== "USC") {
        unfamiliarAcronyms.set(tok, (unfamiliarAcronyms.get(tok) ?? 0) + 1);
      }
    }
  }

  console.log(`=== VetLawGuide Chat Content-Gap Report (Last ${days} Days) ===`);
  console.log(`Total questions: ${rows.length} | Flagged gap / low-retrieval (<=1): ${gapRows.length}`);

  const topDcs = Array.from(unmatchedDcCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(
    `Top unmatched 4-digit DCs: ${topDcs.map(([k, v]) => `${k} (${v})`).join(", ") || "none"}`,
  );

  const topAcronyms = Array.from(unfamiliarAcronyms.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(
    `Top unindexed uppercase tokens: ${topAcronyms.map(([k, v]) => `${k} (${v})`).join(", ") || "none"}`,
  );

  if (gapRows.length > 0) {
    console.log("\nSample gap questions (up to 10):");
    for (const g of gapRows.slice(0, 10)) {
      console.log(
        `- [${g.audience_mode} | retrieved=${g.retrieved_count} | route=${g.top_route ?? "none"}] ${g.question}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("[chat:gaps] Unexpected error:", err);
  process.exit(1);
});
