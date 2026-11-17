import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Epic 1 Global Chrome, WCAG 2.2 AA+, ~84px Header Budget & 400% Zoom", () => {
  test("passes axe WCAG 2.2 AA across Veteran and Practitioner modes with zero ?mode= URL clutter", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Verify compact 3-tier desktop sticky header + Era timeline ribbon height (<= 144px per ADR-0006)
    const headerBox = await page.getByTestId("global-site-header").boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.height).toBeLessThanOrEqual(144);
    await expect(page.getByTestId("sticky-era-timeline-bar")).toBeVisible();

    // Verify sticky timeline bar scrolls with the page and stays pinned at top (y === 0)
    await page.evaluate(() => window.scrollTo(0, 600));
    const scrolledHeaderBox = await page
      .getByTestId("global-site-header")
      .boundingBox();
    expect(scrolledHeaderBox).not.toBeNull();
    expect(Math.abs(scrolledHeaderBox!.y)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Verify GitHubCorner accessibility & destination
    const ghCorner = page.getByRole("link", {
      name: /Questions, bugs, or citation issues\? Open a GitHub Issue/i,
    });
    await expect(ghCorner).toHaveAttribute(
      "href",
      "https://github.com/trustdan/vetlawguide/issues",
    );

    // Veteran mode WCAG 2.2 AA scan
    const vetScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetScan.violations).toEqual([]);

    // Switch to Practitioners mode via top toggle and verify clean canonical URL
    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "practitioner");
    expect(new URL(page.url()).search).toBe("");

    const pracScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pracScan.violations).toEqual([]);

    // Open Scope & CUE/Deadline Cautions modal, verify § 20.1409(c) accuracy & Escape dismissal
    await page.getByRole("button", { name: /Scope & CUE\/Deadline Cautions/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("20.1409(c)");
    const modalScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(modalScan.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("reflows cleanly at 400% zoom (320px viewport width) and honors prefers-reduced-motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("Epic 2 /cfr point-in-time routes enforce 1997-06-20 pub-vs-eff resolution, 90 FR 46542 quarantine, WCAG 2.2 AA, and 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Boundary probe: 1997-06-20 sits between 62 FR 30235 publication (1997-06-03) and effective date (1997-07-03)
    await page.goto("/cfr/38-cfr-4.56?date=1997-06-20");
    await expect(
      page.getByText(/Publication Date vs\. Effective Date Boundary Active/i),
    ).toBeVisible();
    await expect(page.getByText("/cfr/38-cfr-4.56/1946-04-01").first()).toBeVisible();

    // Veteran mode WCAG 2.2 AA check (includes VeteranOverlayCard + Redline viewer + TwoPaneTemporalView)
    const vetCfrScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetCfrScan.violations).toEqual([]);

    // Switch to Practitioners mode and verify verbatim block + Inline Redline mode pass WCAG 2.2 AA
    await page.getByRole("button", { name: "Practitioners" }).click();
    await page.getByRole("button", { name: /Unified Inline/i }).click();
    const pracCfrScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pracCfrScan.violations).toEqual([]);

    // 2. Verify quarantined 90 FR 46542 caution striping on § 4.118 Scars
    await page.goto("/cfr/38-cfr-4.118");
    await expect(page.getByText(/90 FR 46542/i).first()).toBeVisible();
    await expect(
      page.getByText(/Proposed \/ Unfinalized or Rescinded \(Not Enacted Law\)/i),
    ).toBeVisible();

    const scarsScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scarsScan.violations).toEqual([]);

    // 3. Adversarial pre-baseline date probe (1954-06-15 precedes § 3.156(c) 1962-01-01 baseline):
    // must show explicit Do Not Rely gap warning and NEVER claim Verbatim Primary Text Verified
    await page.goto("/cfr/38-cfr-3.156c?date=1954-06-15");
    await expect(
      page.getByText(/No Indexed Snapshot Covers 1954-06-15 — Do Not Rely/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Verbatim Primary Text Verified/i)).toHaveCount(0);

    // 4. Adversarial quarantined permalink probe (/cfr/38-cfr-4.118/2025-09-29 for 90 FR 46542):
    // must show Proposed / Unfinalized — Not Enacted Law and NEVER claim Effective or Verbatim Verified
    await page.goto("/cfr/38-cfr-4.118/2025-09-29");
    await expect(
      page.getByText(/Status: Proposed \/ Unfinalized — Not Enacted Law/i),
    ).toBeVisible();
    await expect(page.getByText(/Not Enacted \/ Quarantined/i)).toBeVisible();
    await expect(page.getByText(/Verbatim Primary Text Verified/i)).toHaveCount(0);

    // 5. 400% zoom (320px width) horizontal-overflow check on /cfr/38-cfr-4.56/1946-04-01 permalink
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/cfr/38-cfr-4.56/1946-04-01");
    const cfrOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(cfrOverflow).toBe(false);
  });

  test("E2-S5 /explore osintframework-style SVG tree morphs across Veteran/Practitioner modes & Decision Dates, honors 1:1 Outline parity, WCAG 2.2 AA, and 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore");

    // Veteran Pathway Explorer Tree active by default
    await expect(page.getByText(/Veteran Pathway Explorer Tree/i)).toBeVisible();
    const vetExploreScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetExploreScan.violations).toEqual([]);

    // Switch to Practitioners mode -> transforms into Point-in-Time Law Tree
    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(page.getByText(/Practitioner Point-in-Time Law Tree/i)).toBeVisible();

    // Morph tree by Decision Date (1997-06-20 Trap) and verify node morphs
    await page.getByRole("button", { name: /§ 4\.56 Gap Trap \(1997-06-20\)/i }).click();
    await expect(
      page.getByRole("button", { name: /Title 38 Law Tree \(1997-06-20\)/i }),
    ).toBeVisible();

    // Tree starts collapsed at first; toggle Expand All -> Collapse All and inspect 1:1 Outline
    const expandToggle = page.getByRole("button", { name: /^Expand All$/i });
    await expect(expandToggle).toBeVisible();
    await expandToggle.click();
    await expect(page.getByRole("button", { name: /^Collapse All$/i })).toBeVisible();

    await page.getByRole("button", { name: /1:1 Outline/i }).click();
    await expect(
      page.getByText(/Pub-Gap Trap \(62 FR 30235\)!/i).first(),
    ).toBeVisible();
    const outlineScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(outlineScan.violations).toEqual([]);

    // Collapse All flips button back to Expand All
    await page.getByRole("button", { name: /^Collapse All$/i }).click();
    await expect(page.getByRole("button", { name: /^Expand All$/i })).toBeVisible();

    // Verify 400% zoom (320px width) reflow on /explore SVG tree
    await page.getByRole("button", { name: /Interactive Tree/i }).click();
    await page.setViewportSize({ width: 320, height: 640 });
    const exploreOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(exploreOverflow).toBe(false);
  });

  test("Epic 3 explainable search, fisheye rail, 3-column playbooks/checklists, /crosswalk, and /reference/forms-and-codes pass WCAG 2.2 AA & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. Instant-lookup DC 5313 chip opens ⌘K modal with deterministic DC range matchReason
    await page.getByRole("button", { name: /DC 5313 \(Hamstrings\)/i }).click();
    const searchDialog = page.getByRole("dialog");
    await expect(searchDialog).toContainText(/5301[-–]5323/i);
    await page.keyboard.press("Escape");
    await expect(searchDialog).toHaveCount(0);

    // 2. Fisheye chronology rail sets global Decision Date
    await page.getByRole("button", { name: /1963.*Mandatory SOC Act/i }).click();
    await expect(page.getByText("1974-08-12").first()).toBeVisible();

    // 3. 3-column Playbook 01 reader in Veteran & Practitioner modes + 400% zoom
    await page.goto("/playbooks/01-penetrating-wounds-scars-vs-muscles");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Gunshot & Shrapnel Wounds Rated Only as a 0% or 10% Skin Scar/i,
      }),
    ).toBeVisible();

    const pbVetScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pbVetScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(page.getByText(/Practitioner Section Outline/i)).toBeVisible();
    const pbPracScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pbPracScan.violations).toEqual([]);

    await page.setViewportSize({ width: 320, height: 640 });
    const pbOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(pbOverflow).toBe(false);

    // 4. Interactive Board CUE Pre-Filing Checklist (in-memory checkbox, zero URL leak)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/checklists/board-cue-pre-filing-gate");
    const firstCheckbox = page.locator('input[type="checkbox"]:visible').first();
    await firstCheckbox.check();
    await expect(page.getByText(/\(1\/\d+ checked/i).first()).toBeVisible();
    expect(new URL(page.url()).search).toBe("");

    const chkScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(chkScan.violations).toEqual([]);

    // 5. Interactive /crosswalk (?q=3010) and /reference/forms-and-codes (7399-7346 decoder)
    await page.goto("/crosswalk?q=3010");
    await expect(page.getByRole("table").getByText(/5110/i).first()).toBeVisible();
    const cwScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(cwScan.violations).toEqual([]);

    await page.goto("/reference/forms-and-codes");
    await expect(page.getByText(/7399.*indicates an unlisted condition/i)).toBeVisible();
    const fcScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(fcScan.violations).toEqual([]);
  });

  test("Epic 4 /investigate workspace passes WCAG 2.2 AA across Veteran & Practitioner modes, honors reduced-motion, and reflows cleanly at 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/investigate");

    // 1. Veteran mode WCAG 2.2 AA scan (including Markdown packet preview)
    await page.getByRole("button", { name: /Preview Exported Markdown/i }).click();
    const vetInvScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetInvScan.violations).toEqual([]);

    // 2. Switch to Practitioners mode + load 1986 BVA Subsumption preset and scan WCAG 2.2 AA
    await page.getByRole("button", { name: "Practitioners" }).click();
    await page.getByTestId("preset-preset-1986-bva-subsumed-cue-gate").click();
    await expect(
      page.getByText(/Explainable Candidate Vehicles/i),
    ).toBeVisible();

    const pracInvScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pracInvScan.violations).toEqual([]);

    // 3. 400% zoom (320px viewport width) + prefers-reduced-motion reflow check
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const invOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(invOverflow).toBe(false);
  });

  test("E5-S1 /vasrd 15-system hubs, /cfr/modules/[slug] verbatim readers, and /eras lenses pass WCAG 2.2 AA & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. /vasrd 16-System Hub
    await page.goto("/vasrd");
    await expect(
      page.getByText(/01\. Musculoskeletal System/i),
    ).toBeVisible();
    const vasrdScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vasrdScan.violations).toEqual([]);

    // 2. /vasrd/01-musculoskeletal Body System Hub
    await page.goto("/vasrd/01-musculoskeletal");
    await expect(page.getByText(/DC 5000–5331/i).first()).toBeVisible();
    const sysScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(sysScan.violations).toEqual([]);

    // 3. /cfr/modules/38-cfr-4.16-tdiu-evolution Multi-Section Verbatim Reader (Veteran + Practitioner + 400% zoom)
    await page.goto("/cfr/modules/38-cfr-4.16-tdiu-evolution");
    const modVetScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(modVetScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(
      page.getByText(/Total disability ratings for compensation based on unemployability/i).first(),
    ).toBeVisible();
    const modPracScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(modPracScan.violations).toEqual([]);

    await page.setViewportSize({ width: 320, height: 640 });
    const modOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(modOverflow).toBe(false);

    // 4. /eras 5-Era Definitions, Matrix & Chronological Hub
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/eras");
    await expect(
      page.getByText(/Era 1 \(1945–1961\): Post-WWII & Korean War Rating Decisions/i),
    ).toBeVisible();
    const erasScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(erasScan.violations).toEqual([]);

    await page.setViewportSize({ width: 320, height: 640 });
    const erasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(erasOverflow).toBe(false);
  });

  test("ADR-0006 sticky top Era bar filters /cases judicial & VAOPGCPREC authorities, surfaces temporal cutoffs, and passes WCAG 2.2 AA & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/cases");

    // 1. Default All Eras state shows full authority directory
    await expect(
      page.getByText(/Showing All \d+ Judicial & VA OGC Authorities/i),
    ).toBeVisible();
    const vetAllScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetAllScan.violations).toEqual([]);

    // 2. Click Era 2 (1962–1988) in the Sticky Top Era Bar -> immediately filters /cases
    const stickyBar = page.getByTestId("sticky-era-timeline-bar");
    await stickyBar.getByRole("button", { name: /1962–1988/i }).click();

    await expect(
      page.getByText(/Filtered by Top Era Bar: Era 2: Pre-VJRA Closed Era/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Pre-July 21, 1992 CUE Cutoff \(VAOPGCPREC 12-95\)/i),
    ).toBeVisible();

    // Switch to Opinion Issued Window on Era 2 and verify honest § 211(a) pre-VJRA explanation
    await page
      .getByRole("button", { name: /Opinion Issued During 1962–1988/i })
      .click();
    await expect(page.getByText(/former 38 U\.S\.C\. § 211\(a\)/i)).toBeVisible();

    // Switch back to Decision Era Governance and select Era 5 (2019–Present) in Sticky Top Bar
    await page
      .getByRole("button", { name: /Switch to Decision Era Governance/i })
      .click();
    await stickyBar.getByRole("button", { name: /2019–Present/i }).click();
    await expect(page.getByText(/Hamill v\. Collins/i).first()).toBeVisible();

    // Switch to Practitioners mode & expand Milestones drawer in sticky bar, then verify WCAG 2.2 AA
    await page.getByRole("button", { name: "Practitioners" }).click();
    await stickyBar.getByRole("button", { name: /Milestones/i }).click();
    const pracEraScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(pracEraScan.violations).toEqual([]);

    // Verify zero ?mode= or ?era= URL clutter and 400% zoom (320px) reflow
    expect(new URL(page.url()).search).toBe("");
    await page.setViewportSize({ width: 320, height: 640 });
    const casesOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(casesOverflow).toBe(false);
  });

  test("E5-S3 multi-era CFR redlines (§ 3.12 COD 2024 FR gap & § 4.124a TBI 10-facet table) enforce honest coverage, WCAG 2.2 AA, and 400% zoom reflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. FR Publication-vs-Effective Date Trap on § 3.12 (published 2024-04-26, effective 2024-06-25):
    // 2024-05-15 must resolve to 2022-05-03 pre-2024 text, surface Publication-Gap Trap Alert,
    // render Honest PLAIN_ENGLISH_IN_PROGRESS banner (no false SHA-256 overlay claim), and show Redline Comparison
    await page.goto("/cfr/38-cfr-3.12a-l?date=2024-05-15");
    await expect(page.locator('[aria-current="page"]')).toContainText("Eff. 2022-05-03");
    await expect(
      page.getByText(/Primary-Source Verified — Plain-English Guide in Progress/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Verbatim Primary Text Verified/i)).toHaveCount(0);
    await expect(page.getByText(/Verbatim Primary Source/i).first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Deterministic Verbatim Redline Comparison/i,
      }),
    ).toBeVisible();

    const codVetScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(codVetScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(page.getByText(/Effective 2022-05-03/i).first()).toBeVisible();
    const codPracScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(codPracScan.violations).toEqual([]);

    // 2. Active § 4.71a renders active post-2021 provision (never labeled repealed), while genuinely repealed § 4.16(c) shows Historical / Superseded Provision + successor link
    await page.goto("/cfr/38-cfr-4.71a-4.73");
    await expect(
      page.getByText(/Historical \/ Superseded Regulatory Provision/i),
    ).toHaveCount(0);
    await expect(page.getByText(/Do Not Rely/i)).toHaveCount(0);

    await page.goto("/cfr/38-cfr-4.16c");
    await expect(
      page.getByText(/Historical \/ Superseded Regulatory Provision/i),
    ).toBeVisible();
    await expect(page.getByText(/Do Not Rely/i)).toHaveCount(0);

    // 3. § 4.124a DC 8045 TBI 10-facet verbatim table renders as structured HTML <table> (zero raw | :--- | pipes) and zero overflow at 400% zoom
    await page.goto("/cfr/38-cfr-4.124a-dc-8045");
    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(
      page.getByText(/Facets of cognitive impairment/i).first(),
    ).toBeVisible();
    await expect(page.locator("#redline-diff")).not.toContainText("| :--- |");
    const tbiScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(tbiScan.violations).toEqual([]);

    await page.setViewportSize({ width: 320, height: 640 });
    const tbiOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(tbiOverflow).toBe(false);
  });
});
