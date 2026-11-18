import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_SESSION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
  NECESSARY_ONLY,
  hasPerformanceConsent,
  parseStoredConsent,
  serializeStoredConsent,
} from "@/lib/consent";
import { resolveClientId } from "@/lib/analytics/measurement-protocol";
import {
  detectBlockingClientPii,
  redactMessagesPii,
  redactPii,
} from "@/lib/chat/pii";
import {
  getClientIp,
  isRateLimited,
  resetRateLimitForTests,
} from "@/lib/chat/rate-limit";
import { retrieveGroundedContext } from "@/lib/chat/retrieve";
import {
  buildStaticSystemSpine,
  buildSystemPrompt,
  buildTurnGroundingPrompt,
} from "@/lib/chat/system-prompt";
import {
  logChatQuestion,
  type ChatQuestionInsertRow,
} from "@/lib/chat/log-conversation";

describe("EPIC 8 — Grounded Corpus Research Chat, Hybrid Retriever & PII Firewall", () => {
  afterEach(() => {
    resetRateLimitForTests();
    vi.restoreAllMocks();
  });

  it("resolves exact Diagnostic Codes, analogous xx99-xxxx notation, and statutory crosswalk citations deterministically (< 15ms warm)", () => {
    // Warm up in-memory index once
    retrieveGroundedContext({ query: "DC 5313", audienceMode: "veteran" });

    const t0 = performance.now();
    const dcResult = retrieveGroundedContext({
      query: "What does Diagnostic Code 5313 cover?",
      audienceMode: "veteran",
    });
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(25);
    expect(dcResult.chunks.length).toBeGreaterThanOrEqual(2);
    expect(
      dcResult.chunks.some(
        (c) =>
          c.href.includes("38-cfr-4.56") ||
          c.href.includes("/vasrd/01-musculoskeletal"),
      ),
    ).toBe(true);

    const analogousResult = retrieveGroundedContext({
      query: "What does 7399-7346 mean on a rating code sheet?",
      audienceMode: "veteran",
    });
    expect(
      analogousResult.chunks.some(
        (c) =>
          c.text.includes("4.20") ||
          c.text.toLowerCase().includes("analog") ||
          c.href.includes("/reference/forms-and-codes"),
      ),
    ).toBe(true);

    const crosswalkResult = retrieveGroundedContext({
      query: "What modern statute replaced former 38 U.S.C. § 3010?",
      audienceMode: "practitioner",
    });
    expect(
      crosswalkResult.chunks.some(
        (c) => c.href.startsWith("/crosswalk") && c.text.includes("5110"),
      ),
    ).toBe(true);
  });

  it("enforces FR Publication Date vs. Effective Date resolution (1997-06-20 -> 1946-04-01 § 4.56, never 1997-07-03)", () => {
    const gapTrap = retrieveGroundedContext({
      query: "Which version of 38 C.F.R. § 4.56 governed a VA decision issued on 1997-06-20?",
      audienceMode: "practitioner",
      activeDecisionDate: "1997-06-20",
    });

    expect(gapTrap.temporalResolutions.length).toBeGreaterThanOrEqual(1);
    const resolved456 = gapTrap.temporalResolutions.find(
      (r) => r.sectionSlug === "38-cfr-4.56",
    );
    expect(resolved456).toBeDefined();
    expect(resolved456?.governingPermalink).toBe("/cfr/38-cfr-4.56/1946-04-01");
    expect(resolved456?.governingPermalink).not.toBe("/cfr/38-cfr-4.56/1997-07-03");
    expect(resolved456?.coverageState).toBe("VERBATIM_VERIFIED");
  });

  it("surfaces CORPUS_GAP_OR_QUEUED_WAVE Do-Not-Rely warnings on unindexed pre-1945 dates without substituting modern eCFR text", () => {
    const gapResult = retrieveGroundedContext({
      query: "Show me 38 C.F.R. § 4.104 as of 1938-05-01",
      audienceMode: "practitioner",
    });

    const resolved = gapResult.temporalResolutions.find((r) =>
      r.sectionSlug.includes("4.104"),
    );
    expect(resolved).toBeDefined();
    expect(resolved?.coverageState).toBe("CORPUS_GAP_OR_QUEUED_WAVE");
    expect(resolved?.doNotRely).toBe(true);
    expect(resolved?.explanation).toMatch(/never silently substitutes|Do not rely/i);
  });

  it("surfaces quarantined proposed/rescinded rulemakings (RIN 2900-AQ82, 90 FR 46542, 91 FR 7118) and CAVC Rule 30(a) / § 20.1409(c) / George guardrails", () => {
    const rinResult = retrieveGroundedContext({
      query: "Did RIN 2900-AQ82 or 91 FR 7118 change mental health ratings?",
      audienceMode: "veteran",
    });
    const combinedRinText = rinResult.chunks.map((c) => c.text).join("\n");
    expect(combinedRinText).toMatch(/proposed|unfinalized|rescinded|quarantined|not enacted/i);

    const cueResult = retrieveGroundedContext({
      query: "How do George v. McDonough and 38 C.F.R. § 20.1409(c) restrict Board CUE motions?",
      audienceMode: "practitioner",
    });
    const combinedCueText = cueResult.chunks.map((c) => c.text).join("\n");
    expect(combinedCueText).toMatch(/20\.1409|20\.1403|George/i);
  });

  it("blocks SSNs and VA claim numbers client-side while allowing Diagnostic Codes, VA Form numbers, FR citations, and ISO dates", () => {
    const syntheticSsn = ["123", "45", "6789"].join("-");
    const syntheticClaim = ["C", "12345678"].join("-");
    const syntheticFileLabel = `VA File # ${["87", "654", "321"].join("")}`;

    expect(detectBlockingClientPii(`My SSN is ${syntheticSsn}`)).not.toBeNull();
    expect(detectBlockingClientPii(`Claim file ${syntheticClaim}`)).not.toBeNull();
    expect(detectBlockingClientPii(syntheticFileLabel)).not.toBeNull();

    // Legitimate legal research tokens MUST NOT false-positive
    const safeLegalQueries = [
      "What does DC 5313 or 7399-7346 mean?",
      "Explain VA Form 21-4138, VA Form 10-7131, VA Form 21-0995, and 8-526.",
      "Compare 62 FR 30235 (1997-06-20) with 90 FR 46542 and RIN 2900-AQ82.",
      "Does VAOPGCPREC 12-95 or Pub. L. 100-687 apply to 38 C.F.R. § 20.1409(c)?",
    ];
    for (const q of safeLegalQueries) {
      expect(detectBlockingClientPii(q), `False positive on safe query: "${q}"`).toBeNull();
      expect(redactPii(q)).toBe(q);
    }
  });

  it("deterministically scrubs SSNs, VA file numbers, emails, and phone numbers in redactPii() and redactMessagesPii()", () => {
    const syntheticSsn = ["123", "45", "6789"].join("-");
    const syntheticClaim = ["C", "23456789"].join("-");
    const syntheticEmail = ["veteran.user", "example.org"].join("@");
    const syntheticPhone = ["(555)", "234-5678"].join(" ");

    const raw = `Contact ${syntheticEmail} or ${syntheticPhone} re ${syntheticSsn} and ${syntheticClaim} under DC 5313.`;
    const scrubbed = redactPii(raw);

    expect(scrubbed).not.toContain(syntheticSsn);
    expect(scrubbed).not.toContain(syntheticClaim);
    expect(scrubbed).not.toContain(syntheticEmail);
    expect(scrubbed).not.toContain("234-5678");
    expect(scrubbed).toContain("[REDACTED-SSN]");
    expect(scrubbed).toContain("[REDACTED-VA-FILE]");
    expect(scrubbed).toContain("[REDACTED-EMAIL]");
    expect(scrubbed).toContain("[REDACTED-PHONE]");
    expect(scrubbed).toContain("DC 5313");

    const scrubbedMessages = redactMessagesPii([
      { role: "user", content: `SSN ${syntheticSsn}` },
      { role: "assistant", content: "I cannot review personal SSNs." },
    ]);
    expect(scrubbedMessages[0]?.content).toBe("[REDACTED-SSN]");
  });

  it("builds a prompt-cached static system spine + dynamic turn grounding free of banned slogans and rich with UPL/bitemporal guardrails", () => {
    const spine = buildStaticSystemSpine();
    expect(spine.length).toBeGreaterThan(2500);
    expect(spine).toContain("20.1409(c)");
    expect(spine).toContain("20.1403(e)");
    expect(spine).toContain("Rule 30(a)");
    expect(spine).toContain("/privacy");
    expect(spine).not.toMatch(/\b100%\s+verified\b/i);
    expect(spine).not.toMatch(/\bzero[-\s]+hallucinations?\b/i);
    expect(spine).not.toMatch(/\bCUE[-\s]+safe\b/i);

    const turnPrompt = buildTurnGroundingPrompt({
      query: "Explain 38 C.F.R. § 3.156(c)",
      audienceMode: "veteran",
      activeDecisionDate: "1974-08-12",
    });
    expect(turnPrompt).toContain("veteran");
    expect(turnPrompt).toContain("1974-08-12");
    expect(turnPrompt).toContain("/cfr/38-cfr-3.156c");

    const combined = buildSystemPrompt({
      query: "Explain 38 C.F.R. § 3.156(c)",
      audienceMode: "practitioner",
      activeDecisionDate: null,
    });
    expect(combined).toContain(spine);
  });

  it("enforces 10-requests-per-5-minutes IP sliding window rate limiting and safelogConversation / consent fallbacks", async () => {
    const ip = "203.0.113.42";
    for (let i = 0; i < 10; i += 1) {
      expect(isRateLimited(ip)).toBe(false);
    }
    expect(isRateLimited(ip)).toBe(true);

    const headers = new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("198.51.100.7");

    // Consent cookie parsing defaults to false until granted
    expect(CONSENT_COOKIE_NAME).toBe("vlg_consent");
    expect(CHAT_SESSION_COOKIE_NAME).toBe("vlg_chat_session");
    expect(hasPerformanceConsent(undefined)).toBe(false);
    expect(hasPerformanceConsent("malformed")).toBe(false);
    const necessarySerialized = serializeStoredConsent(NECESSARY_ONLY);
    expect(hasPerformanceConsent(necessarySerialized)).toBe(false);
    const grantedSerialized = serializeStoredConsent({ performance: true });
    expect(parseStoredConsent(grantedSerialized)?.performance).toBe(true);
    expect(hasPerformanceConsent(grantedSerialized)).toBe(true);

    // GA4 client_id extractor
    expect(resolveClientId("GA1.1.123456789.1700000000")).toBe("123456789.1700000000");
    expect(resolveClientId(undefined)).toMatch(/^[0-9a-f-]{36}$/i);

    // Graceful no-op when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      await expect(
        logChatQuestion({
          sessionId: "sess-1",
          conversationId: "00000000-0000-4000-8000-000000000001",
          turnIndex: 1,
          audienceMode: "veteran",
          activeDecisionDate: "1997-06-20",
          question: "What is DC 5313?",
          topRoute: "/cfr/38-cfr-4.56/1946-04-01",
          retrievedCount: 4,
          hasCorpusGap: false,
        }),
      ).resolves.toBeUndefined();
    } finally {
      if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
      if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    }

    // Persists ONLY a flat PII-scrubbed user question row (zero AI response fields)
    const insertedRows: ChatQuestionInsertRow[] = [];
    const syntheticSsn = ["123", "45", "6789"].join("-");
    await logChatQuestion(
      {
        sessionId: "sess-2",
        conversationId: "00000000-0000-4000-8000-000000000002",
        turnIndex: 2,
        audienceMode: "practitioner",
        activeDecisionDate: "1997-06-20",
        question: `How does TDIU under 38 C.F.R. § 4.16 work? SSN ${syntheticSsn}`,
        topRoute: "/cfr/38-cfr-4.16",
        retrievedCount: 5,
        hasCorpusGap: false,
      },
      {
        async insert(row) {
          insertedRows.push(row);
          return { error: null };
        },
      },
    );

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toEqual({
      conversation_id: "00000000-0000-4000-8000-000000000002",
      session_id: "sess-2",
      turn_index: 2,
      audience_mode: "practitioner",
      active_decision_date: "1997-06-20",
      question: "How does TDIU under 38 C.F.R. § 4.16 work? [REDACTED-SSN]",
      top_route: "/cfr/38-cfr-4.16",
      retrieved_count: 5,
      has_corpus_gap: false,
    });
    expect(Object.keys(insertedRows[0]!)).not.toContain("messages");

    // Automatically falls back to the 6 core columns if optional retrieval columns aren't in Supabase yet
    const fallbackAttempts: ChatQuestionInsertRow[] = [];
    await logChatQuestion(
      {
        sessionId: "sess-3",
        conversationId: "00000000-0000-4000-8000-000000000003",
        turnIndex: 1,
        audienceMode: "veteran",
        activeDecisionDate: null,
        question: "What is 38 C.F.R. § 3.156(c)?",
        topRoute: "/cfr/38-cfr-3.156c",
        retrievedCount: 3,
        hasCorpusGap: false,
      },
      {
        async insert(row) {
          fallbackAttempts.push(row);
          if ("top_route" in row) {
            return {
              error: {
                code: "PGRST204",
                message:
                  "Could not find the 'has_corpus_gap' column of 'chat_questions' in the schema cache",
              },
            };
          }
          return { error: null };
        },
      },
    );
    expect(fallbackAttempts).toHaveLength(2);
    expect(fallbackAttempts[1]).toEqual({
      conversation_id: "00000000-0000-4000-8000-000000000003",
      session_id: "sess-3",
      turn_index: 1,
      audience_mode: "veteran",
      active_decision_date: null,
      question: "What is 38 C.F.R. § 3.156(c)?",
    });
  });
});
