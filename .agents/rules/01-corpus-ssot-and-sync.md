# Rule 01: Corpus Single Source of Truth, Pinned Sync & Honest Coverage

1. **Read-Only Upstream Boundary (`corpus/upstream/`):**
   - `corpus/upstream/` is a SHA-256-locked snapshot of `C:\Users\Dan\VA-law-planning` recorded in `corpus/manifest.lock.json`.
   - **Never hand-edit, patch, or delete files inside `corpus/upstream/`** (`.agents/hooks/corpus_lock_guard.py` enforces a hard `PreToolUse` block). Fix primary legal text, CFR transition records, or schemas upstream in `VA-law-planning`, then run `pnpm corpus:sync`.

2. **Single Canonical Home for Verbatim Regulatory Text:**
   - Verbatim historical and current `38 C.F.R.` text must render from compiled `authority-snapshot` entities (`/cfr/[section]/[effective-from]`).
   - Never duplicate or re-type multi-paragraph CFR criteria inside UI components, `content/overlays/veteran/`, or marketing copy where it can silently drift. Always reference the canonical `version_id` or `authority_id`.

3. **Four-State Honest Coverage Protocol (Zero Silent Fallbacks):**
   - Every CFR section view, VASRD body-system hub, and module page must render one of four explicit coverage states from `corpus/generated/coverage-manifest.json`:
     - `VERBATIM_VERIFIED`: Primary-source verbatim text verified for the queried date, showing official `GovInfo`/`Federal Register` link, publication vs. effective dates, `"Checked as of YYYY-MM-DD"`, and corpus version tag.
     - `SUMMARY_ONLY`: `verbatim_text_status` is `summary-only-pull-print-cfr-before-cue`; must display an explicit amber caution instructing practitioners to pull the print CFR edition before pleading CUE.
     - `PLAIN_ENGLISH_IN_PROGRESS`: Upstream practitioner module is verified while its Veteran plain-English overlay is pending; must show a transparent notice with inline acronym tooltips active over the structured reference.
     - `CORPUS_GAP_OR_QUEUED_WAVE`: Unindexed historical CFR date window OR an upstream `VA-law-planning` wave still in progress; must display **`Gap / Not Yet Indexed — Do Not Rely`** (or queued-wave status) with direct official `GovInfo`/`eCFR` links—**never** silently falling back to current eCFR text.
