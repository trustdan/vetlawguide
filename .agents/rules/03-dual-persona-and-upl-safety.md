# Rule 03: Dual-Persona Architecture (`Veterans | Practitioners`) & UPL Safety

1. **Both Audiences First-Class From Day 1 (Clean Canonical URLs):**
   - Keep the top-bar **`[ Veterans | Practitioners ]`** toggle active across the site from Epic 1.
   - Render both layers into static HTML and switch instantaneously via `<html data-mode="veteran|practitioner">` set by a tiny blocking inline script reading `localStorage`—never pollute canonical shareable URLs with `?mode=`.
   - **Mandatory Cross-Inspection:** Regardless of active mode, Veterans must always have a 1-click **"Inspect exact legal authority"** expander, and Practitioners must always have a 1-click **"View plain-English explanation"** expander.

2. **Hash-Locked Veteran Overlays (`content/overlays/veteran/`):**
   - Every Veteran plain-English companion must bind to its upstream `VA-law-planning` module via `upstream_id` + `upstream_sha256` + `linked_version_ids`.
   - Any mismatch detected by `pnpm qa:drift` (`scripts/audit_translation_drift.ts`) blocks release until reviewed.

3. **Strict Unauthorized Practice of Law (UPL) Guardrails:**
   - Always render the persistent Tier 1 Educational Disclaimer Bar (*"Educational Reference Only — Nothing on VetLawGuide constitutes legal or medical advice or creates an attorney-client relationship"*) with its `[Scope & CUE/Deadline Cautions]` drawer.
   - Veteran-facing copy and `/investigate` Veteran exports must present **educational explanations**, **records to locate** (FOIA/C-file, NPRC clinical packets), and **"Questions to Discuss With an Accredited VSO, Claims Agent, or Attorney"**—never individualized directives (`"You have a winning CUE claim"`, `"File a Board CUE motion immediately"`).

4. **Plain-English Ergonomics & Zero Leaked Jargon:**
   - Never expose raw `SCREAMING_SNAKE_CASE` or kebab-case schema enums (`open-claim-only-george-restricted`, `cue-ro-3.105a`) in user-facing UI.
   - Automatically wrap VA/military acronyms (`C&P`, `TDIU`, `SMC`, `NOD`, `SOC`, `GSW`, `SFW`, `T&T`) and form numbers (`8-526`, `10-7131`, `DD 1380`) with accessible keyboard/touch inline decoder tooltips sourced from `forms-and-codesheet-lexicon.md`.
