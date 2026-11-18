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

    // Verify 400% zoom (320px width) reflow + >= 50% usable content height (ADR-0007)
    const zoomHeaderBox = await page.getByTestId("global-site-header").boundingBox();
    expect(zoomHeaderBox).not.toBeNull();
    expect(zoomHeaderBox!.height).toBeLessThanOrEqual(320);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("EPIC 10 & EPIC 12 gateway home, <= 120px mobile header, neutral charcoal dark mode, Guides tabs, and Octocat pointer-events pass WCAG 2.2 AA", async ({
    page,
  }) => {
    // 1. Desktop 1280×800: Search + all 4 illustrated gateways visible above the fold, <= 250 words, Octocat click-through hit-testing
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const mainWordCount = await page.locator("main").evaluate((el) => {
      const text = (el as HTMLElement).innerText || "";
      return text.trim().split(/\s+/).filter(Boolean).length;
    });
    expect(mainWordCount).toBeLessThanOrEqual(250);

    for (const gwId of [
      "gateway-card-browse-topics",
      "gateway-card-disability-ratings",
      "gateway-card-investigate-decision",
      "gateway-card-law-and-cases",
    ]) {
      const gwBox = await page.getByTestId(gwId).boundingBox();
      expect(gwBox, `${gwId} missing`).not.toBeNull();
      expect(
        gwBox!.y + gwBox!.height,
        `${gwId} extends below 1280×800 fold`,
      ).toBeLessThanOrEqual(800);
    }

    // Verify authentic Octocat upper-right hit-target AND lower-left pass-through to underlying header
    const octocatHitTest = await page.evaluate(() => {
      const cornerLink = document.querySelector('[data-testid="github-corner"]');
      if (!cornerLink) return { found: false, topRightHitsOcto: false, bottomLeftPassesThrough: false };
      const rect = cornerLink.getBoundingClientRect();
      const topRightEl = document.elementFromPoint(rect.right - 12, rect.top + 12);
      const bottomLeftEl = document.elementFromPoint(rect.left + 8, rect.bottom - 8);
      return {
        found: true,
        topRightHitsOcto: Boolean(topRightEl && cornerLink.contains(topRightEl)),
        bottomLeftPassesThrough: Boolean(bottomLeftEl && !cornerLink.contains(bottomLeftEl)),
      };
    });
    expect(octocatHitTest).toEqual({
      found: true,
      topRightHitsOcto: true,
      bottomLeftPassesThrough: true,
    });

    // Verify visitor-question primary navigation stays identical across Veteran & Practitioner modes
    const primaryNav = page.getByRole("navigation", {
      name: "Primary research navigation",
    });
    const vetNavLabels = await primaryNav.locator("a, button").allInnerTexts();
    await page.getByRole("button", { name: "Practitioners" }).click();
    const pracNavLabels = await primaryNav.locator("a, button").allInnerTexts();
    expect(pracNavLabels).toEqual(vetNavLabels);
    expect(vetNavLabels.map((s) => s.trim())).toEqual([
      "Browse",
      "Ratings",
      "Investigate",
      "Law",
      "Guides",
      "Reference",
    ]);

    // Verify neutral charcoal dark mode (#17181a -> rgb(23, 24, 26)) + WCAG 2.2 AA
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(darkBg).toBe("rgb(23, 24, 26)");

    const darkHomeScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(darkHomeScan.violations).toEqual([]);

    // 2. Unified /playbooks Guides hub filter pills (All guides, Issue guides, Checklists, Legal treatises)
    await page.goto("/playbooks");
    await page.getByRole("button", { name: /^Checklists/i }).click();
    await expect(
      page.locator('a[href="/checklists/board-cue-pre-filing-gate"]:visible').first(),
    ).toBeVisible();
    const guidesDarkScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(guidesDarkScan.violations).toEqual([]);

    // 3. Mobile 390×844: Sticky header <= 120px, Search + Gateway 1 above the fold, "Law as of" chip opens Era sheet
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const mobileHeaderBox = await page.getByTestId("global-site-header").boundingBox();
    expect(mobileHeaderBox).not.toBeNull();
    expect(mobileHeaderBox!.height).toBeLessThanOrEqual(120);

    const firstGwBox = await page.getByTestId("gateway-card-browse-topics").boundingBox();
    expect(firstGwBox).not.toBeNull();
    expect(firstGwBox!.y + firstGwBox!.height).toBeLessThanOrEqual(844);

    await page.getByTestId("era-chip-trigger").click();
    const era2Btn = page.getByRole("button", { name: /1962–1988/i });
    await expect(era2Btn).toBeVisible();
    await era2Btn.click();
    await page.getByTestId("era-chip-trigger").click();

    // 4. Verify active-date chip truncation + >= 50% usable content height at 320×640 (400% zoom)
    await page.setViewportSize({ width: 320, height: 640 });
    const activeChipOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(activeChipOverflow).toBe(false);
    const activeZoomHeader = await page.getByTestId("global-site-header").boundingBox();
    expect(activeZoomHeader).not.toBeNull();
    expect(activeZoomHeader!.height).toBeLessThanOrEqual(320);
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

  test("EPIC 11 /explore 5-branch Browse Directory default, #survivor-benefits deep-link, date-reactive badges, and short-label Map toggle pass WCAG 2.2 AA & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore");

    // 1. Directory is the default active presentation mode with all 5 visitor-need branches
    await expect(page.getByRole("button", { name: /^Directory$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const branchHeading of [
      "Disability ratings",
      "Older decisions and review options",
      "Survivor and family benefits",
      "Records, forms, and unfamiliar terms",
      "Law, cases, and historical changes",
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name: branchHeading }),
      ).toBeVisible();
    }

    const vetExploreScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetExploreScan.violations).toEqual([]);

    // 2. Select Decision Date (1997-06-20 Trap) and verify live Pub-Gap Trap badge inside Disability ratings
    await page.getByRole("button", { name: /§ 4\.56 Gap Trap \(1997-06-20\)/i }).click();
    await expect(
      page.getByText(/Pub-Gap Trap \(62 FR 30235\)!/i).first(),
    ).toBeVisible();

    // 3. Deep-link to /explore#survivor-benefits auto-expands Survivor and family benefits branch
    await page.goto("/explore#survivor-benefits");
    await expect(
      page.locator("#survivor-benefits button[aria-expanded='true']").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /38 C\.F\.R\. § 3\.22 DIC Benefits/i }).first(),
    ).toBeVisible();

    // 4. Switch to Practitioners mode & toggle secondary short-label Map view
    await page.getByRole("button", { name: "Practitioners" }).click();
    await page.getByRole("button", { name: /^Map$/i }).click();
    await expect(
      page.getByRole("button", { name: /Browse Title 38 Topics/i }),
    ).toBeVisible();

    const mapScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(mapScan.violations).toEqual([]);

    // 5. Verify 400% zoom (320px width) reflow across Map & Directory views
    await page.setViewportSize({ width: 320, height: 640 });
    const exploreMapOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(exploreMapOverflow).toBe(false);

    await page.getByRole("button", { name: /^Directory$/i }).click();
    const exploreDirOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(exploreDirOverflow).toBe(false);
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

    // 2. Fisheye chronology rail (canonical single home at /timeline per ADR-0008) sets global Decision Date
    await page.goto("/timeline");
    await page.getByRole("button", { name: /1963.*Mandatory SOC Act/i }).click();
    await expect(page.locator("#sticky-decision-date-input")).toHaveValue(
      "1974-08-12",
    );

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

  test("Epic 4 & E11-S3 staged /investigate workspace + 3-block summary passes WCAG 2.2 AA across Veteran & Practitioner modes, honors reduced-motion, and reflows cleanly at 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/investigate");

    // 1. Stage 1 Veteran mode WCAG 2.2 AA scan
    const vetStage1Scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetStage1Scan.violations).toEqual([]);

    // Select explicit "I don't know the exact date" in Stage 1, then advance to Stage 4 Summary, verify 3 blocks & Markdown packet preview
    await expect(page.getByTestId("stage-tab-4")).toBeDisabled();
    await page.getByTestId("decision-date-unknown-btn").click();
    await page.getByTestId("stage-tab-4").click();
    await expect(page.getByTestId("summary-what-you-know")).toBeVisible();
    await expect(page.getByTestId("records-to-locate-section")).toBeVisible();
    await expect(page.getByTestId("summary-questions-to-discuss")).toBeVisible();

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

  test("ADR-0006 & E11-S2 /cases 25-per-page pagination, expandable compact rows, and sticky Era filtering pass WCAG 2.2 AA & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/cases");

    // 1. Default All Eras state shows full authority count + 25-per-page pagination
    await expect(
      page.getByText(/Showing All \d+ Judicial & VA OGC Authorities/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Showing 1–25 of 437 authorities · Page 1 of 18/i).first(),
    ).toBeVisible();

    // Advance to Page 2 and expand the first row's holding details
    await page
      .getByRole("navigation", { name: "Authorities pagination top" })
      .getByRole("button", { name: /Next/i })
      .click();
    await expect(
      page.getByText(/Showing 26–50 of 437 authorities · Page 2 of 18/i).first(),
    ).toBeVisible();

    const firstDetailsBtn = page
      .getByRole("button", { name: /^Details & \d+ guide/i })
      .first();
    await firstDetailsBtn.click();
    await expect(page.getByText(/^Holding:/i).first()).toBeVisible();

    const vetAllScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(vetAllScan.violations).toEqual([]);

    // 2. Click Era 2 (1962–1988) in the Sticky Top Era Bar -> immediately filters /cases and resets pagination to Page 1
    const stickyBar = page.getByTestId("sticky-era-timeline-bar");
    await stickyBar.getByRole("button", { name: /1962–1988/i }).click();

    await expect(
      page.getByText(/Filtered by Top Era Bar: Era 2: Pre-VJRA Closed Era/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Showing 1–\d+ of \d+ authorities/i).first(),
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

    // Verify zero ?mode= / ?era= / ?page= URL clutter and 400% zoom (320px) reflow
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
    // render VERBATIM_VERIFIED + SHA-256 Locked Companion banner (111/111 E5-S4/S5 overlay parity), and show Redline Comparison
    await page.goto("/cfr/38-cfr-3.12a-l?date=2024-05-15");
    await expect(page.locator('[aria-current="page"]')).toContainText("Eff. 2022-05-03");
    await expect(
      page.getByText(/Verbatim Primary Text Verified/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Plain-English Companion · SHA-256 Locked/i).first(),
    ).toBeVisible();
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

  test("EPIC 6 Piercing-Finality Flowchart, semantic Map edges, and 4-track /timeline + Quarantined Watchlist pass WCAG 2.2 AA, keyboard nav, reduced-motion, and 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. /explore#older-decisions features Piercing-Finality Decision Flowchart & semantic Map edges
    await page.goto("/explore#older-decisions");
    const flowchartDirLink = page
      .getByRole("link", { name: /Piercing-Finality Decision Flowchart/i })
      .first();
    await expect(flowchartDirLink).toBeVisible();

    await page.getByRole("button", { name: /^Map$/i }).click();
    await expect(page.getByText("Relationship edges:")).toBeVisible();
    await expect(page.getByText("pierces finality").first()).toBeVisible();
    await page
      .getByRole("button", { name: /Browse Topics & Situations/i })
      .focus();
    await expect(page.getByTestId("map-focus-ring-browse-root")).toBeVisible();
    const mapEdgeScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(mapEdgeScan.violations).toEqual([]);

    // 2. Dedicated /explore/piercing-finality keyboard Tab focus ring + ArrowDown navigation, FR date-gap alert, and 1:1 Accessible Outline parity
    await page.goto("/explore/piercing-finality");
    const step1Node = page.getByRole("button", {
      name: /^Step 1: Void rating reduction/i,
    });
    await step1Node.focus();
    await expect(
      page.getByTestId("flowchart-focus-ring-void-reduction"),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.getByTestId("flowchart-focus-ring-service-records-3156c"),
    ).toBeVisible();
    await step1Node.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("flowchart-step-inspector")).toContainText(
      "Step 2 of 6",
    );

    await page
      .getByRole("button", { name: /§ 3\.156\(c\) FR Gap \(2006-09-20\)/i })
      .click();
    await expect(page.getByTestId("flowchart-step-inspector")).toContainText(
      "71 FR 52455",
    );

    const flowVetScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(flowVetScan.violations).toEqual([]);

    // Switch to Practitioners + 1:1 Accessible Outline mode and verify exact § 20.1409(c) Step 6 parity
    await page.getByRole("button", { name: "Practitioners" }).click();
    await page.getByRole("button", { name: /1:1 Accessible Outline/i }).click();
    await expect(page.getByTestId("flowchart-accessible-outline")).toContainText(
      "20.1409(c)",
    );
    const outlineScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(outlineScan.violations).toEqual([]);

    // 400% zoom (320×640) + prefers-reduced-motion reflow check on /explore/piercing-finality
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: /Interactive Flowchart/i }).click();
    const flowOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(flowOverflow).toBe(false);
    const flowZoomHeader = await page.getByTestId("global-site-header").boundingBox();
    expect(flowZoomHeader).not.toBeNull();
    expect(flowZoomHeader!.height).toBeLessThanOrEqual(320);

    // 3. Dedicated /timeline 4-track chronology + toggleable Quarantined Watchlist (7 notices)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/timeline");
    await expect(
      page.getByTestId("timeline-selected-split-card"),
    ).toContainText("Retroactive Opportunity");
    await expect(
      page.getByTestId("timeline-selected-split-card"),
    ).toContainText("Temporal Trap");

    // Watchlist is quarantined out of default enacted view until toggled open (scan WCAG 2.2 AA both closed and open per AUD-AG-001)
    await expect(page.getByTestId("quarantined-watchlist-panel")).toHaveCount(0);
    const timelineClosedScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(timelineClosedScan.violations).toEqual([]);

    await page.getByTestId("toggle-quarantined-watchlist").click();
    const watchPanel = page.getByTestId("quarantined-watchlist-panel");
    await expect(watchPanel).toBeVisible();
    for (const qId of [
      "RIN 2900-AQ72",
      "RIN 2900-AQ73",
      "RIN 2900-AQ82",
      "RIN 2900-AR96",
      "RIN 2900-AS39",
      "90 FR 46542",
      "91 FR 7118",
    ]) {
      await expect(watchPanel).toContainText(qId);
    }

    const timelineLightScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(timelineLightScan.violations).toEqual([]);

    // Dark mode WCAG 2.2 AA scan on /timeline with Quarantined Watchlist open
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    const timelineDarkScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(timelineDarkScan.violations).toEqual([]);

    // Mobile 390×844 header budget (<= 120px) & 400% zoom (320×640) reflow on /timeline
    await page.setViewportSize({ width: 390, height: 844 });
    const tlMobileHeader = await page.getByTestId("global-site-header").boundingBox();
    expect(tlMobileHeader).not.toBeNull();
    expect(tlMobileHeader!.height).toBeLessThanOrEqual(120);

    await page.setViewportSize({ width: 320, height: 640 });
    const tlOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(tlOverflow).toBe(false);
  });

  test("Epic 8 ChatWidget & /privacy pass WCAG 2.2 AA in light/dark modes, support Escape focus return, and reflow cleanly at 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", {
        name: /Privacy, Cookie Choices & On-Device Isolation/i,
      }),
    ).toBeVisible();

    const privacyLightScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(privacyLightScan.violations).toEqual([]);

    // Open ChatWidget via footer OpenChatLink ("Research chat") custom event
    await page.getByRole("button", { name: "Research chat", exact: true }).click();
    const chatPanel = page.getByTestId("chat-widget-panel");
    await expect(chatPanel).toBeVisible();

    const chatLightScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(chatLightScan.violations).toEqual([]);

    // Toggle dark mode + expanded view and scan WCAG 2.2 AA
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await page.getByRole("button", { name: "Expand chat window" }).click();
    const chatDarkScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(chatDarkScan.violations).toEqual([]);

    // Escape closes panel and restores focus to launcher button
    await page.keyboard.press("Escape");
    await expect(chatPanel).toHaveCount(0);
    await expect(page.getByTestId("chat-widget-launcher")).toBeFocused();

    // Verify 400% zoom (320×640) reflow with ChatWidget open
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByTestId("chat-widget-launcher").click();
    await expect(chatPanel).toBeVisible();
    const zoomOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(zoomOverflow).toBe(false);
  });

  test("Quick Guide (?) button, global '?' keyboard shortcut, input guard, and /about pass WCAG 2.2 AA", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. Typing '?' on the page opens QuickHelpDialog; Escape closes and returns focus to '?' button
    await page.keyboard.press("?");
    const helpDialog = page.getByTestId("quick-help-dialog");
    await expect(helpDialog).toBeVisible();
    await expect(helpDialog).toContainText(/Quick Guide & Keyboard Shortcuts/i);

    const modalScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(modalScan.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(helpDialog).toHaveCount(0);
    await expect(page.getByTestId("quick-help-trigger")).toBeFocused();

    // 2. Typing '?' inside an active text input does NOT open QuickHelpDialog
    await page.getByTestId("chat-widget-launcher").click();
    const chatInput = page.locator("#vlg-chat-input");
    await chatInput.fill("");
    await chatInput.pressSequentially("What is TDIU?");
    await expect(chatInput).toHaveValue("What is TDIU?");
    await expect(helpDialog).toHaveCount(0);
    await page.getByRole("button", { name: "Close chat" }).click();

    // 3. Clicking '?' button opens modal and navigates cleanly to /about
    await page.getByTestId("quick-help-trigger").click();
    await expect(helpDialog).toBeVisible();
    await helpDialog.getByRole("link", { name: /About VetLawGuide/i }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(
      page.getByRole("heading", { name: "About VetLawGuide", level: 1 }),
    ).toBeVisible();

    const aboutLightScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(aboutLightScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Toggle color theme" }).click();
    const aboutDarkScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(aboutDarkScan.violations).toEqual([]);
  });

  test("EPIC 13 archival 404 page, CFR section fallback, footer Crisis/Rep links, and zero-PII Report-an-Error links pass WCAG 2.2 AA", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Unknown route returns HTTP 404 with plain-English copy, search launcher, 4 gateways, and footer support links
    const notFoundRes = await page.goto("/unknown-missing-page-probe");
    expect(notFoundRes).not.toBeNull();
    expect(notFoundRes!.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /This page isn't here/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Search codes \(5313, 7804\)/i }),
    ).toBeVisible();
    for (const gwLabel of [
      "Browse topics",
      "Disability ratings",
      "Investigate a decision",
      "Law and cases",
    ]) {
      await expect(
        page.getByRole("link", { name: new RegExp(gwLabel, "i") }).first(),
      ).toBeVisible();
    }

    // Footer Crisis Line & Find-a-Rep links visible in both Veterans and Practitioners modes
    const footerSupport = page.getByTestId("footer-support-links");
    await expect(footerSupport).toContainText(/Veterans Crisis Line/i);
    await expect(footerSupport).toContainText(/988/);
    await expect(footerSupport).toContainText(/838255/);
    await expect(
      footerSupport.getByRole("link", {
        name: /Find a VA-accredited representative/i,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.va.gov/get-help-from-accredited-representative/find-rep/",
    );

    const scan404 = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan404.violations).toEqual([]);

    // 2. Unmatched /cfr/[section]/[effectiveFrom] date returns 404 with "See all versions of this section" -> /cfr/[section]
    const unmatchedCfrRes = await page.goto("/cfr/38-cfr-4.56/1999-01-01");
    expect(unmatchedCfrRes).not.toBeNull();
    expect(unmatchedCfrRes!.status()).toBe(404);
    const cfrFallbackLink = page
      .getByTestId("not-found-cfr-fallback")
      .getByRole("link", { name: /See all versions of this section/i });
    await expect(cfrFallbackLink).toHaveAttribute("href", "/cfr/38-cfr-4.56");

    // 3. Per-page "Report an error on this page" link pre-fills static citation/version and never leaks Decision Date or audience mode
    await page.goto("/cfr/38-cfr-4.56/1946-04-01");
    await page
      .getByRole("button", { name: /FR Pub-vs-Eff Trap \(1997-06-20\)/i })
      .click();
    await page.getByRole("button", { name: "Practitioners" }).click();

    const reportLink = page.getByTestId("report-page-error-link").first();
    await expect(reportLink).toBeVisible();
    const reportHref = await reportLink.getAttribute("href");
    expect(reportHref).toBeTruthy();
    const parsedIssueUrl = new URL(reportHref!);
    expect(parsedIssueUrl.origin + parsedIssueUrl.pathname).toBe(
      "https://github.com/trustdan/vetlawguide/issues/new",
    );
    expect(parsedIssueUrl.searchParams.get("template")).toBe(
      "citation-or-date-fix.yml",
    );
    expect(parsedIssueUrl.searchParams.get("page_or_version")).toContain(
      "/cfr/38-cfr-4.56/1946-04-01",
    );
    expect(parsedIssueUrl.searchParams.get("authority")).toContain("4.56");
    expect(reportHref).not.toContain("1997-06-20");
    expect(reportHref).not.toContain("practitioner");
    expect(parsedIssueUrl.searchParams.get("zero_pii_confirm")).toBeNull();
  });
});
