# VetLawGuide — Post-Code Launch & External Operations Guide

> All `57 / 57` engineering slices (`Epics 0–12`) are shipped in code. This runbook covers the external dashboard configurations, search-engine submissions, and recurring maintenance workflows that live outside the git repository.

---

## 1. Vercel Domain, SSL & Bot Protection

1. **Attach & Verify Custom Domain (`vetlawguide.com`):**
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → select **`vetlawguide`** → **Settings → Domains**.
   - Add both `vetlawguide.com` and `www.vetlawguide.com` (recommended: set `www.vetlawguide.com` to `308` redirect to apex `https://vetlawguide.com` so canonical URLs match `metadataBase`).
   - At your DNS registrar, point:
     - Apex `@` (`A` record) → `76.76.21.21`
     - `www` (`CNAME` record) → `cname.vercel-dns.com`
   - Once SSL provisions, spot-check these three machine-readable endpoints in your browser:
     - Robots policy: https://vetlawguide.com/robots.xml *(redirects/serves `/robots.txt`)* → https://vetlawguide.com/robots.txt
     - XML Sitemap (`388` canonical routes): https://vetlawguide.com/sitemap.xml
     - AI Citation Manifest: https://vetlawguide.com/llms.txt

2. **Enable Vercel BotID for `/api/chat`:**
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → **`vetlawguide`** → **Firewall** (or **Security → BotID**).
   - Confirm **BotID** is toggled **On** so `checkBotId()` inside `app/api/chat/route.ts` actively screens automated abuse before OpenAI `gpt-5-nano` calls execute.

3. **Confirm Production Environment Variables:**
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → **`vetlawguide`** → **Settings → Environment Variables**:
     - `OPENAI_API_KEY` — Paid commercial API key (`gpt-5-nano` zero-training tier).
     - `SUPABASE_URL` — Project URL from Supabase (`Settings → API`).
     - `SUPABASE_SERVICE_ROLE_KEY` — Server-only `service_role` secret key (never expose in `NEXT_PUBLIC_*`).
     - *(Optional)* `CHAT_MODEL` — Defaults to `gpt-5-nano` if unset.
     - *(Optional)* `GA_MEASUREMENT_ID` + `GA_API_SECRET` — Only needed if you want server-side GA4 `chat_message` counts for opted-in visitors (see Section 4).

---

## 2. Google Search Console (Indexing All 388 Canonical Routes)

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
   - Click **Submit**. Google will discover all `388` static routes (`/cfr/*`, `/vasrd/*`, `/playbooks/*`, `/docs/*`, `/eras/*`, `/checklists/*`, `/cases`, `/timeline`, `/crosswalk`, `/explore`).

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

---

## 6. Ongoing Federal Register Currency & Upstream Corpus Sync

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
