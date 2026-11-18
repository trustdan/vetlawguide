# ADR-0003: Grounded Corpus Chat Agent — Model Economics (`gpt-5-nano`), Local Hybrid Retrieval & Client PII Firewall

- **Status:** Approved (`2026-11-16`; updated `2026-11-17` for full `111`-module corpus, `WK-private-demo` widget parity, PII-redacted Supabase `chat_questions` user-question-only logging & consent-gated GA4)
- **Governs:** `EPIC 8` & `E9-S5` (`app/api/chat/route.ts`, `lib/chat/`, `supabase/migrations/`, `lib/consent.ts`, `lib/analytics/`, `components/chrome/chat-widget.tsx`, `components/providers/consent-provider.tsx`)
- **Reference Implementation:** Adapted directly from `C:\Users\Dan\WK-private-demo` (`app/api/chat/route.ts`, `lib/chat/system-prompt.ts`, `lib/chat/log-conversation.ts`, `lib/consent.ts`, `lib/analytics/measurement-protocol.ts`, `components/shared/chat-widget.tsx`, `components/shared/consent-provider.tsx`)

---

## 1. Context & Problem Statement

We want a site-wide grounded research chat assistant modeled directly on `WK-private-demo`'s floating bottom-right pill + expandable streaming panel (`Maximize2` / `Minimize2` toggle + custom event launcher), using the **lowest-cost commercial zero-training LLM across OpenAI, Anthropic, and Google Gemini** and a **`$0.00` zero-database build-time retrieval index** across `vetlawguide`'s full `111`-module primary-source corpus (`174` CFR snapshots, `437` judicial/`VAOPGCPREC` authorities, `72+` statutory crosswalks, `40` lexicon items, and SHA-256-locked Veteran overlays).

---

## 2. Decisions

### Decision 1: Default Model — OpenAI `gpt-5-nano` (Paid API Tier, Zero Data Training)
- **Verified Pricing Comparison (per 1M tokens, Nov. 2026):**
  - **OpenAI `gpt-5-nano`:** **`$0.05` input** (`$0.005` cached input) / **`$0.40` output** (`400K` context).
  - **Anthropic `claude-haiku` (`4.5` / `5.5`):** `$0.10–$1.00` input / `$0.50–$5.00` output.
  - **Google `gemini-flash-lite` (Paid zero-training tier):** `$0.10–$0.30` input / `$0.40–$2.50` output *(Note: Google AI Studio's `$0` Free Tier permits Google to review/train on prompts and is strictly prohibited on a Veterans Law platform under `Rule 05`)*.
- **Selection:** Pin `gpt-5-nano` (via Vercel AI SDK / OpenAI API with prompt caching enabled and `CHAT_MODEL` env-overridable if a cheaper zero-training model launches). At ~5K cached spine tokens + ~4K retrieved passage tokens + ~350 output tokens, **1,000 user turns cost `~$0.35` total (`~$0.00035` per answer)**.

### Decision 2: Grounding Architecture — Prompt-Cached Spine + Build-Time Deterministic Hybrid Retrieval (`$0.00` Vector DB Cost)
We reject fine-tuning (bakes stale rules into weights without citations), external vector databases (`pgvector` / Pinecone overhead), and runtime HTTP self-scraping (latency). Instead:
1. **Prompt-Cached System Spine (~4K tokens, cached across turns):**
   - Enforces UPL educational-only framing, `§ 20.1409(c)` merits Board CUE precision, *George v. McDonough* (`§ 20.1403(e)`) rules, `CAVC Rule 30(a)` and `RIN` proposal quarantine, and active `AudienceMode` (`Veterans` plain-English vs. `Practitioners` pin-cite density).
   - Embeds the compact **Site Route & Wave Bookmark Map** from `coverage-manifest.json` so the assistant knows every live `Wave 1` URL *and* every `Wave W2–W5` placeholder + official `eCFR` fallback link.
2. **In-Memory Deterministic + BM25 Corpus Retriever (`lib/chat/retrieve.ts`, `< 2ms`, `$0.00`):**
   - Reuses `lib/corpus/`'s compiled JSON indices (`cfr-versions.json`, `statutory-crosswalk.json`, `lexicon.json`, `precedents.json`, unlocked `corpus/upstream/` Markdown, and `content/overlays/veteran/`) at server cold start.
   - Deterministically resolves exact Diagnostic Codes (`5313 -> 5301-5323`), `38 C.F.R.` / `U.S.C.` citations, `decisionDate` snapshots (`resolveCfrAtDate`), and top BM25 sections, injecting only the top `3–5` authoritative chunks + canonical site links into each turn.
   - Automatically stays 100% synchronized every time `pnpm corpus:sync` advances `corpus/ingestion-ledger.json` (`W1 -> W5`).

### Decision 3: `WK-private-demo` UI/Streaming Pattern + VetLawGuide Privacy & `/investigate` Isolation Guardrails
1. **UI & Streaming Pattern (Adapted from `WK-private-demo`):**
   - **Floating Bottom-Right Pill Launcher (`<ChatWidget />`):** Compact rounded pill button (`fixed bottom-4 right-4 sm:bottom-6 sm:right-6`) with VetLawGuide's archival emblem + `"Chat"` label, plus `<OpenChatLink />` (`vlg:open-chat` custom window event) so nav/footer/help links can open the chat panel without page navigation.
   - **Compact <-> Expanded Streaming Reader:** Matches `WK-private-demo`'s `h-[70vh] w-[90vw] max-h-150 max-w-95` panel with a header `Maximize2` / `Minimize2` toggle (`fixed inset-4 sm:inset-8`), plain-text `ReadableStream` (`fetch("/api/chat")` with `cancel()` stream abort), and chat-scaled `react-markdown` components (`h1`–`h3` rendered at bold body scale; internal `/cfr/*`, `/vasrd/*`, `/playbooks/*`, `/cases` links routed via Next.js `<Link>`).
2. **Privacy, Rate-Limit, Supabase Conversation Logging & `/investigate` Isolation Guardrails:**
   - **Zero Auto-Network:** `<ChatWidget />` makes **zero** network calls until a user opens the panel and submits a question.
   - **Hard `/investigate` Blackout:** Private `Yes / No / Unknown` screening answers in `/investigate` are **never** auto-injected or transmitted to `/api/chat`, and third-party analytics (`gtag.js` / GA4) are unconditionally suppressed on `/investigate` even when site analytics consent is granted (`Rule 05`).
   - **Client + Server PII Firewall & Auto-Redaction:** Blocks obvious SSNs / VA claim numbers client-side before `fetch`, and runs a deterministic server-side `redactPii()` scrubber (`SSN`, `VA file #`, email, phone -> `[REDACTED-*]`) before model invocation and before database persistence, paired with `botid` (`checkBotId()`) + per-IP sliding-window rate limiting (`MAX_MESSAGES = 20`, `MAX_MESSAGE_LENGTH = 2000`, `10 msgs / 5 min`).
   - **Supabase `chat_questions` User-Question Analytics Store (`lib/chat/log-conversation.ts`, adapted from `WK-private-demo`):**
     - Scheduled via Next.js `after(() => logChatQuestion(...).catch(() => {}))` so database writes never block or break streaming responses on Vercel, and gracefully no-ops when `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset in local/CI builds.
     - Inserts one flat row per user question `(conversation_id, session_id, turn_index, audience_mode, active_decision_date, question, top_route, retrieved_count, has_corpus_gap)` into a Row-Level-Security-locked (`ENABLE ROW LEVEL SECURITY`, zero `anon` read/write policies) `public.chat_questions` table storing **only** PII-scrubbed user questions (never AI responses) so we can analyze visitor questions, Diagnostic Codes, and corpus gaps directly in SQL/CSV.
     - Persists `vlg_chat_session` cookie (and fires GA4 Measurement Protocol `chat_message` event via `after()`) **only** when `hasPerformanceConsent` (`vlg_consent`) is `true`; otherwise uses only the ephemeral per-tab `conversationId`.
     - **Transparent Disclosure:** `<ChatWidget />` displays a clear notice above the input (*"Questions may be logged (with SSNs/claim IDs auto-redacted) to help us improve our guides — never enter private medical or identifying details. See Privacy."*) and `lib/chat/system-prompt.ts` instructs the assistant to answer honestly if asked whether chat questions are logged.
