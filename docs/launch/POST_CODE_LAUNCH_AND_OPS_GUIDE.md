# VetLawGuide — Post-Code Launch & External Operations Guide

> This runbook covers the external dashboard configurations, rate-limit and spend guardrails, search-engine submissions, and recurring maintenance workflows that live outside the git repository.

---

## 1. Vercel Domain, SSL, Firewall Rate Limit & OpenAI Spend Cap

1. **Attach & Verify Custom Domain (`vetlawguide.com`):**
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → select **`vetlawguide`** → **Settings → Domains**.
   - Add both `vetlawguide.com` and `www.vetlawguide.com` (recommended: set `www.vetlawguide.com` to `308` redirect to apex `https://vetlawguide.com` so canonical URLs match `metadataBase`).
   - At your DNS registrar, point:
     - Apex `@` (`A` record) → `76.76.21.21`
     - `www` (`CNAME` record) → `cname.vercel-dns.com`
   - Once SSL provisions, spot-check these three machine-readable endpoints in your browser:
     - Robots policy: https://vetlawguide.com/robots.xml *(redirects/serves `/robots.txt`)* → https://vetlawguide.com/robots.txt
     - XML Sitemap (`390` canonical routes): https://vetlawguide.com/sitemap.xml
     - AI Citation Manifest: https://vetlawguide.com/llms.txt

2. **Enable Vercel BotID & Shared Firewall Rate-Limit Rule for `/api/chat` (`$0`):**
   - **Step 2a — BotID:** Open [Vercel Dashboard](https://vercel.com/dashboard) → **`vetlawguide`** → **Firewall** (or **Security → BotID**) and confirm **BotID** is toggled **On** so `checkBotId()` inside `app/api/chat/route.ts` screens automated abuse before `gpt-5-nano` calls execute.
   - **Step 2b — Shared Edge Rate Limit (`POST /api/chat`) + In-Memory Backstop:** Because `lib/chat/rate-limit.ts` (`10` msgs / `5` min) is a process-local `Map` inside each warm serverless instance (kept as a per-instance backstop), enforce one shared edge limit across all instances via **Vercel Firewall** (`$0`, zero billable usage on rate-limited requests):
     - **Via Vercel CLI in Windows PowerShell (from `c:\Users\Dan\vetlawguide`):**
       ```powershell
       # Alias vercel in this PowerShell session via pnpm dlx (no global install needed):
       function vercel { pnpm --allow-build=esbuild dlx vercel@latest @args }

       # Sign in to Vercel (opens browser) and link this repo -> .vercel/project.json:
       vercel login
       vercel link

       # 1. Stage in log mode first to verify zero false positives:
       vercel firewall rules add "Rate limit POST /api/chat" `
         --condition '{\"type\":\"path\",\"op\":\"eq\",\"value\":\"/api/chat\"}' `
         --condition '{\"type\":\"method\",\"op\":\"eq\",\"value\":\"POST\"}' `
         --action rate_limit `
         --rate-limit-window 300 `
         --rate-limit-requests 15 `
         --rate-limit-keys ip `
         --rate-limit-action log `
         --yes
       vercel firewall diff
       vercel firewall publish --yes

       # 2. Switch to enforced 429 rate_limit and publish:
       vercel firewall rules update "Rate limit POST /api/chat" `
         --condition '{\"type\":\"path\",\"op\":\"eq\",\"value\":\"/api/chat\"}' `
         --condition '{\"type\":\"method\",\"op\":\"eq\",\"value\":\"POST\"}' `
         --action rate_limit `
         --rate-limit-window 300 `
         --rate-limit-requests 15 `
         --rate-limit-keys ip `
         --rate-limit-action rate_limit `
         --yes
       vercel firewall diff
       vercel firewall publish --yes
       ```
     - **Or via Vercel Dashboard:** **Firewall → Configure → + New Rule** → Name: `Rate limit POST /api/chat` → If `Request Path` equals `/api/chat` **AND** `Request Method` equals `POST` → Then **`Rate Limit`** (`Fixed Window`, `15` requests per `300s` by `IP`, action `429 Too Many Requests`) → **Save Rule → Publish Changes**.
     - **Confirm `429` in production:** Send `16` rapid `POST https://vetlawguide.com/api/chat` requests from one IP and verify request `16+` returns HTTP `429` (`<ChatWidget />` displays a calm plain-English retry message).

3. **Set Hard Monthly OpenAI Project Spend Cap & Usage Alert:**
   - Open [OpenAI Platform Billing Limits](https://platform.openai.com/settings/organization/limits) (or **Project → Limits** for the dedicated `vetlawguide` API project):
     - Set a **Hard Monthly Budget Limit** (e.g., `$10.00 / month` — covers `~28,000` `gpt-5-nano` research turns) with **Reject requests when budget is reached** enabled.
     - Set an **Email Usage Notification Threshold** at `50%` and `80%` of the monthly budget.

4. **Confirm Production Environment Variables:**
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → **`vetlawguide`** → **Settings → Environment Variables**:
     - `OPENAI_API_KEY` — Paid commercial API key (`gpt-5-nano` zero-training tier).
     - `SUPABASE_URL` — Project URL from Supabase (`Settings → API`).
     - `SUPABASE_SERVICE_ROLE_KEY` — Server-only `service_role` secret key (never expose in `NEXT_PUBLIC_*`).
     - *(Optional)* `CHAT_MODEL` — Defaults to `gpt-5-nano` if unset.
     - *(Optional)* `GA_MEASUREMENT_ID` + `GA_API_SECRET` — Only needed if you want server-side GA4 `chat_message` counts for opted-in visitors (see Section 4).

---

## 2. Google Search Console (Indexing All 391 Canonical Routes)

1. **Add Domain Property:**
   - Go to [Google Search Console](https://search.google.com/search-console).
   - Click the property selector (top-left) → **Add property** → choose **Domain** (left card) and enter `vetlawguide.com`.
   - Copy the `TXT` record Google provides (`google-site-verification=...`), add it to your DNS provider for `vetlawguide.com`, wait 1–2 minutes, and click **Verify**.

2. **Submit XML Sitemap:**
   - In the left sidebar of [Google Search Console](https://search.google.com/search-console), click **Sitemaps**.
   - Under **Add a new sitemap**, enter:
     ```text
     https://vetlawguide.com/sitemap.xml
     ```
   - Click **Submit**. Google will discover all `391` static routes (`/cfr/*`, `/vasrd/*`, `/playbooks/*`, `/docs/*`, `/eras/*`, `/checklists/*`, `/cases`, `/timeline`, `/crosswalk`, `/explore`, `/terms`, `/accessibility`).

3. **Request Priority Crawl on Core Gateways:**
   - Paste these URLs one at a time into the top **Inspect any URL** bar in Search Console and click **Request Indexing**:
     - `https://vetlawguide.com/`
     - `https://vetlawguide.com/explore`
     - `https://vetlawguide.com/vasrd`
     - `https://vetlawguide.com/cfr`
     - `https://vetlawguide.com/cases`
     - `https://vetlawguide.com/timeline`

---

## 3. Bing Webmaster Tools (Powers Bing, DuckDuckGo & ChatGPT/Copilot Search)

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Choose **Import from Google Search Console** (fastest—skips manual DNS verification and automatically imports your verified `vetlawguide.com` property and sitemap).
3. Under **Sitemaps**, verify `https://vetlawguide.com/sitemap.xml` is listed and shows **Success**.

---

## 4. Google Tag Manager (`GTM-W9T68MCQ`) & Optional GA4 Measurement Protocol

- **Public-Page Tag (`GTM-W9T68MCQ`):** Already wired into `components/chrome/google-tag-manager.tsx` behind visitor opt-in (`vlg_consent`) and **unconditionally unmounted on `/investigate`**.
  - Manage container tags at [Google Tag Manager](https://tagmanager.google.com).
  - View traffic reports at [Google Analytics](https://analytics.google.com).
- **Optional Server-Side `chat_message` Events:**
  - If you want opted-in chat turn counts reflected in GA4 alongside page views:
    1. Open [Google Analytics](https://analytics.google.com) → **Admin (gear icon) → Data collection and modification → Data streams** → click your web stream.
    2. Copy your **`G-XXXXXXXXXX` Measurement ID** → save as `GA_MEASUREMENT_ID` in Vercel.
    3. Scroll down to **Measurement Protocol API secrets** → **Create** → copy the secret value → save as `GA_API_SECRET` in Vercel, then redeploy.

---

## 5. Supabase User-Question Analytics (`public.chat_questions`)

- Open [Supabase Dashboard](https://supabase.com/dashboard) → select your project:
  - **Browse & Export CSV:** Click **Table Editor** (left sidebar) → **`chat_questions`** → use **Export to CSV** anytime for offline spreadsheet or LLM topic clustering.
  - **Optional 3-Column Retrieval Metadata Upgrade:** If you haven't added `top_route`, `retrieved_count`, and `has_corpus_gap` yet and want automatic corpus-gap tagging on each question, open **SQL Editor** in Supabase and run:
    ```sql
    alter table public.chat_questions
      add column if not exists top_route text null,
      add column if not exists retrieved_count smallint not null default 0,
      add column if not exists has_corpus_gap boolean not null default false;

    grant all on table public.chat_questions to service_role;
    notify pgrst, 'reload schema';
    ```
  - **Enable 180-Day Automatic Retention Purge (`supabase/migrations/0003_chat_questions_retention.sql`):**
    - Open **SQL Editor** in Supabase and run `supabase/migrations/0003_chat_questions_retention.sql` to install `public.purge_expired_chat_questions(180)` and schedule the daily `03:17 UTC` `pg_cron` job (`purge-expired-chat-questions-180d`), matching the `180`-day retention policy stated on `/privacy`.
  - **Monthly Content-Gap Review Cadence (`pnpm chat:gaps` — First Business Monday of Each Month):**
    - Run `pnpm chat:gaps` locally (with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`) or run this read-only SQL query in Supabase **SQL Editor**:
      ```sql
      select
        audience_mode,
        active_decision_date,
        retrieved_count,
        top_route,
        question,
        created_at
      from public.chat_questions
      where created_at >= now() - interval '30 days'
        and (has_corpus_gap = true or retrieved_count <= 1)
      order by created_at desc
      limit 100;
      ```
    - **Monthly triage output:**
      1. Unmatched 4-digit Diagnostic Codes or unindexed pre-1990 `38 C.F.R.` print eras → log primary-source module requests upstream in `VA-law-planning`.
      2. Unfamiliar VA acronyms or legacy form numbers → add decoded entries to the upstream lexicon and sync via `pnpm corpus:sync`.
      3. Before modifying `lib/chat/system-prompt.ts`, `lib/chat/retrieve.ts`, or `CHAT_MODEL`, run the manual golden evaluation suite (`pnpm eval:chat`, `35` reviewed test questions in `tests/eval/chat-golden.jsonl`; stays out of CI because live model runs incur API cost).

---

## 6. Site-Wide Content-Security-Policy Rollout (`next.config.ts`)

- `next.config.ts` ships:
  1. **Enforced strict CSP on `/investigate`** (`connect-src 'self'`, zero external scripts/beacons — active immediately).
  2. **Site-wide baseline `Content-Security-Policy-Report-Only`** across all other routes (allowing self-hosted assets, `/api/chat`, `botid` same-origin challenge worker/iframe, and consent-gated `GTM-W9T68MCQ` / GA4).
- **After one clean week in production** (verifying zero console CSP report warnings across `/`, `/cfr/*`, `/explore`, and `<ChatWidget />`), promote `key: "Content-Security-Policy-Report-Only"` to `key: "Content-Security-Policy"` in `next.config.ts` while leaving `/investigate`'s stricter rule untouched.

---

## 7. Ongoing Federal Register Currency & Upstream Corpus Sync

1. **Automated Federal Register Drift Watcher (Zero Setup Required):**
   - Workflow: [Federal Register 38 C.F.R. Drift Watcher](https://github.com/trustdan/vetlawguide/actions/workflows/federal-register-watch.yml)
   - Runs automatically every **Monday and Thursday at `13:15 UTC`** against the public Federal Register API (`38 C.F.R. Parts 3, 4, 14, and 20`) and opens an alert in [GitHub Issues](https://github.com/trustdan/vetlawguide/issues) whenever VA publishes a new rule or updates a quarantined `RIN` proposal.
   - Make sure GitHub Actions are enabled on the repository under [Actions Settings](https://github.com/trustdan/vetlawguide/settings/actions) with **Read and write permissions** enabled for `GITHUB_TOKEN` so the workflow can create alert issues.

2. **Syncing Upstream Legal Updates (`VA-law-planning` → `vetlawguide`):**
   - Whenever new historical `38 C.F.R.` snapshots or modules are verified in `C:\Users\Dan\VA-law-planning`, pull and verify them locally before pushing:
     ```powershell
     $env:PYTHONNOUSERSITE = "1"
     pnpm corpus:sync
     pnpm corpus:compile
     pnpm qa:all
     pnpm test
     ```

3. **Require the CI Quality & Playwright Browser Gate on `main`:**
   - Open [Repository Rulesets / Branch Protection](https://github.com/trustdan/vetlawguide/settings/branches) → protect **`main`**.
   - Enable **Require status checks to pass before merging** and select **`Compiler, Legal/UPL QA, Typecheck & Tests`** (from `.github/workflows/ci-quality-gates.yml`, which runs `pnpm qa:all`, `pnpm build`, and full Playwright `pnpm test:e2e` with automatic `playwright-report/` artifact uploads on failure).
