# ADR-0003: Grounded Corpus Chat Agent — Model Economics (`gpt-5-nano`), Local Hybrid Retrieval & Client PII Firewall

- **Status:** Approved (`2026-11-16`)
- **Governs:** `EPIC 7` (`app/api/chat/route.ts`, `lib/chat/`, `components/chrome/chat-widget.tsx`)
- **Reference Implementation:** Adapted from `C:\Users\Dan\WK-private-demo` (`app/api/chat/route.ts`, `lib/chat/system-prompt.ts`, `components/shared/chat-widget.tsx`)

---

## 1. Context & Problem Statement

We want a site-wide grounded research chat assistant (modeled on `WK-private-demo`'s floating streaming widget) using the **lowest-cost commercial LLM across OpenAI, Anthropic, and Google Gemini** and the **most efficient corpus-grounding mechanism** as `vetlawguide` scales from `Wave 1` (`10` modules) to `Wave 5` (`125+` modules).

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

### Decision 3: Privacy, Rate-Limit & `/investigate` Isolation Guardrails
- **Zero Auto-Network:** `<ChatWidget />` makes **zero** network calls until a user opens the panel and submits a question.
- **Zero `/investigate` Leakage:** On `/investigate`, private `Yes / No / Unknown` screening state is **never** auto-injected or transmitted to `/api/chat`.
- **Client + Server PII Firewall:** Reuses our SSN and VA-file-number regex guards client-side (blocking accidental PII before `fetch`) and server-side, with stateless streaming (zero database logging of user prompts by default), `botid` / per-IP rate limiting (`10 msgs / 5 min`), and graceful fallback if the API key is unset.
