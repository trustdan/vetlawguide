/**
 * Manual Grounded Chat Evaluation Harness (`pnpm eval:chat`).
 *
 * Stays OUT of CI because full model runs call OpenAI (`gpt-5-nano` or `CHAT_MODEL`).
 * Run manually before changing `lib/chat/system-prompt.ts`, `lib/chat/retrieve.ts`,
 * or `CHAT_MODEL`:
 *
 *   pnpm eval:chat                   # Full live model + retrieval evaluation
 *   pnpm eval:chat --retrieval-only  # $0.00 offline schema & retrieval check
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";
import {
  buildStaticSystemSpine,
  buildTurnGroundingBundle,
} from "../lib/chat/system-prompt";
import type { AudienceMode } from "../lib/corpus/types";
import { listAllCanonicalPaths } from "../lib/seo/crawl-audit";

export interface GoldenChatEvalCase {
  id: string;
  category:
    | "grounded-veteran"
    | "grounded-practitioner"
    | "temporal-boundary"
    | "coverage-honesty"
    | "quarantine-safety"
    | "site-governance"
    | "upl-boundary"
    | "out-of-scope-refusal";
  audienceMode: AudienceMode;
  decisionDate: string | null;
  question: string;
  expectedRoutes: string[];
  requiredPatterns: string[];
  mustNotSay: string[];
}

const REPO_ROOT = resolve(__dirname, "..");
const GOLDEN_PATH = resolve(REPO_ROOT, "tests", "eval", "chat-golden.jsonl");

export function loadGoldenChatEvalCases(): GoldenChatEvalCase[] {
  const lines = readFileSync(GOLDEN_PATH, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, idx) => {
    try {
      return JSON.parse(line) as GoldenChatEvalCase;
    } catch (err) {
      throw new Error(`Invalid JSON on line ${idx + 1} of chat-golden.jsonl: ${String(err)}`);
    }
  });
}

function checkRetrievalHit(
  testCase: GoldenChatEvalCase,
  canonicalSet: ReadonlySet<string>,
): { ok: boolean; details: string[] } {
  const issues: string[] = [];

  for (const r of testCase.expectedRoutes) {
    if (!canonicalSet.has(r)) {
      issues.push(`expectedRoute "${r}" is not a valid canonical site route`);
    }
  }

  if (testCase.expectedRoutes.length === 0) {
    return { ok: issues.length === 0, details: issues };
  }

  const bundle = buildTurnGroundingBundle({
    query: testCase.question,
    audienceMode: testCase.audienceMode,
    activeDecisionDate: testCase.decisionDate,
  });

  const surfacedRoutes = new Set<string>();
  for (const ch of bundle.retrieved.chunks) {
    const cleanHref = ch.href.split("#")[0]!;
    surfacedRoutes.add(cleanHref);
    const parentCfrMatch = /^(\/cfr\/[^/]+)\/\d{4}-\d{2}-\d{2}$/.exec(cleanHref);
    if (parentCfrMatch?.[1]) {
      surfacedRoutes.add(parentCfrMatch[1]);
    }
  }
  for (const tr of bundle.retrieved.temporalResolutions) {
    if (tr.governingPermalink) surfacedRoutes.add(tr.governingPermalink);
    surfacedRoutes.add(`/cfr/${tr.sectionSlug}`);
  }
  // Static spine also exposes primary navigation routes (/privacy, /about, /cases, /timeline, /crosswalk)
  for (const navRoute of ["/privacy", "/about", "/cases", "/timeline", "/crosswalk"]) {
    surfacedRoutes.add(navRoute);
  }

  const matchedAnyExpected = testCase.expectedRoutes.some((r) =>
    surfacedRoutes.has(r),
  );
  if (!matchedAnyExpected) {
    issues.push(
      `retrieval missed expectedRoutes [${testCase.expectedRoutes.join(", ")}] (got [${Array.from(surfacedRoutes).slice(0, 6).join(", ")}])`,
    );
  }

  return { ok: issues.length === 0, details: issues };
}

async function main(): Promise<void> {
  const retrievalOnly = process.argv.includes("--retrieval-only");
  const cases = loadGoldenChatEvalCases();
  const canonicalSet = new Set(listAllCanonicalPaths());

  if (cases.length < 30 || cases.length > 50) {
    console.error(
      `[eval:chat] FAIL: Expected 30–50 golden questions, found ${cases.length}.`,
    );
    process.exit(1);
  }

  let retrievalPassed = 0;
  const retrievalFailures: string[] = [];

  for (const tc of cases) {
    const res = checkRetrievalHit(tc, canonicalSet);
    if (res.ok) {
      retrievalPassed += 1;
    } else {
      retrievalFailures.push(`${tc.id}: ${res.details.join("; ")}`);
    }
  }

  console.log(
    `[eval:chat] Retrieval grounding check: ${retrievalPassed}/${cases.length} passed.`,
  );
  if (retrievalFailures.length > 0) {
    console.error(
      `[eval:chat] Retrieval failures:\n- ${retrievalFailures.join("\n- ")}`,
    );
    process.exit(1);
  }

  if (retrievalOnly) {
    console.log("[eval:chat] PASS (--retrieval-only mode, $0.00 API spend).");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[eval:chat] OPENAI_API_KEY is not set. Set OPENAI_API_KEY to score live model answers, or pass --retrieval-only.",
    );
    process.exit(1);
  }

  const model = process.env.CHAT_MODEL?.trim() || "gpt-5-nano";
  const supportsReasoningEffort =
    model.startsWith("gpt-5") || model.startsWith("o");
  const client = new OpenAI({ apiKey });
  const spine = buildStaticSystemSpine();

  let modelPassed = 0;
  const modelFailures: string[] = [];

  for (const tc of cases) {
    const grounding = buildTurnGroundingBundle({
      query: tc.question,
      audienceMode: tc.audienceMode,
      activeDecisionDate: tc.decisionDate,
    });

    const completion = await client.chat.completions.create({
      model,
      store: false,
      max_completion_tokens: 1400,
      prompt_cache_key: "vlg-system-spine-v1",
      ...(supportsReasoningEffort ? { reasoning_effort: "minimal" } : {}),
      messages: [
        { role: "system", content: spine },
        { role: "system", content: grounding.prompt },
        { role: "user", content: tc.question },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "";
    const caseIssues: string[] = [];

    if (tc.expectedRoutes.length > 0) {
      const citedAnyRoute = tc.expectedRoutes.some((r) => answer.includes(r));
      if (!citedAnyRoute) {
        caseIssues.push(
          `missing expected route link (${tc.expectedRoutes.join(" or ")})`,
        );
      }
    }

    for (const pat of tc.requiredPatterns) {
      const re = new RegExp(pat, "i");
      if (!re.test(answer)) {
        caseIssues.push(`missing required pattern /${pat}/i`);
      }
    }

    for (const banned of tc.mustNotSay) {
      if (answer.toLowerCase().includes(banned.toLowerCase())) {
        caseIssues.push(`uttered banned phrase "${banned}"`);
      }
    }

    if (caseIssues.length === 0) {
      modelPassed += 1;
      console.log(`  PASS  ${tc.id} (${tc.category})`);
    } else {
      modelFailures.push(`${tc.id}: ${caseIssues.join("; ")}`);
      console.error(`  FAIL  ${tc.id}: ${caseIssues.join("; ")}`);
    }
  }

  console.log(
    `\n[eval:chat] Live model score (${model}): ${modelPassed}/${cases.length} (${Math.round((modelPassed / cases.length) * 100)}%).`,
  );

  if (modelFailures.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[eval:chat] Fatal error:", err);
    process.exit(1);
  });
}
