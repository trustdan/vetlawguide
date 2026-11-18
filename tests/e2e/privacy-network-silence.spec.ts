import { expect, test } from "@playwright/test";

const ALLOWED_PUBLIC_GTM_HOSTS = new Set([
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "analytics.google.com",
  "region1.google-analytics.com",
]);

test.describe("Zero-Telemetry & On-Device /investigate Privacy Guardrail", () => {
  test("home page mounts Google Tag (GTM-W9T68MCQ) with zero unexpected third-party requests and clean URL query strings", async ({
    page,
  }) => {
    const unexpectedExternalRequests: string[] = [];

    page.on("request", (req) => {
      const raw = req.url();
      if (raw.startsWith("blob:") || raw.startsWith("data:")) return;
      const url = new URL(raw);
      if (
        url.hostname !== "127.0.0.1" &&
        url.hostname !== "localhost" &&
        !ALLOWED_PUBLIC_GTM_HOSTS.has(url.hostname)
      ) {
        unexpectedExternalRequests.push(raw);
      }
    });

    // Block live Google Tag egress inside test runner so offline CI never hangs while verifying DOM injection
    await page.route("https://www.googletagmanager.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );

    await page.goto("/");
    // Prior to explicit opt-in, zero third-party Google Tag scripts are injected
    await expect(page.locator("script#vlg-gtm-script")).toHaveCount(0);

    // Opting into analytics injects Google Tag (GTM-W9T68MCQ) with zero unexpected third-party hosts
    await page.getByTestId("consent-accept-all").click();
    await expect(page.locator("script#vlg-gtm-script")).toHaveAttribute(
      "src",
      /googletagmanager\.com\/gtm\.js\?id=GTM-W9T68MCQ/,
    );
    expect(unexpectedExternalRequests).toEqual([]);
    expect(new URL(page.url()).search).toBe("");

    // Navigating via link from an opted-in public page into /investigate purges GTM via clean document load
    await page.getByRole("link", { name: "Investigate", exact: true }).click();
    await expect(page).toHaveURL(/\/investigate$/, { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("script#vlg-gtm-script")).toHaveCount(0);
  });

  test("full /investigate screening & packet export session fires zero network/XHR/beacon calls, zero URL leaks, and zero storage leaks", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const externalRequests: string[] = [];
    const postLoadRuntimeRequests: string[] = [];

    page.on("request", (req) => {
      const raw = req.url();
      if (raw.startsWith("blob:") || raw.startsWith("data:")) return;
      const url = new URL(raw);
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
        externalRequests.push(raw);
      }
    });

    const invResponse = await page.goto("/investigate", { waitUntil: "networkidle" });
    expect(invResponse).not.toBeNull();
    const invHeaders = invResponse!.headers();
    expect(invHeaders["content-security-policy"]).toContain("connect-src 'self'");
    expect(invHeaders["permissions-policy"]).toContain("camera=()");

    // Record ANY network request (XHR, fetch, beacon, pixel image, script, websocket) fired AFTER /investigate hydration
    page.on("request", (req) => {
      const raw = req.url();
      if (raw.startsWith("blob:") || raw.startsWith("data:")) return;
      postLoadRuntimeRequests.push(`${req.resourceType()}:${req.method()} ${raw}`);
    });

    // 1. Fresh session starts with an EMPTY Decision Date (never 1974-08-12) and locks Stage 2..4 until a date or "I don't know the exact date" is chosen
    await expect(page.locator("#investigate-decision-date")).toHaveValue("");
    await expect(page.getByTestId("stage-next-btn")).toBeDisabled();
    await expect(page.getByTestId("stage-skip-summary-btn")).toBeDisabled();
    await expect(page.getByTestId("stage-tab-4")).toBeDisabled();
    await expect(page.getByTestId("report-page-error-link")).toHaveCount(0);

    // Explicitly selecting "I don't know the exact date" unlocks Stage 4, keeps the date Unknown, and elevates "Find the decision letter"
    await page.getByTestId("decision-date-unknown-btn").click();
    await expect(page.getByTestId("stage-tab-4")).toBeEnabled();
    await page.getByTestId("stage-tab-4").click();
    await expect(page.getByTestId("summary-what-you-know")).toContainText(
      /What you know/i,
    );
    await expect(page.getByTestId("summary-what-you-know")).toContainText(
      /Unknown \(locate decision letter\)/i,
    );
    await expect(page.getByTestId("summary-what-you-know")).not.toContainText(
      "1974-08-12",
    );
    await expect(page.getByTestId("records-to-locate-section")).toContainText(
      /Find the decision letter/i,
    );
    await expect(page.getByTestId("records-to-locate-section")).toContainText(
      /NPRC Inpatient Clinical/i,
    );
    await expect(page.getByTestId("summary-questions-to-discuss")).toContainText(
      /Questions to discuss/i,
    );
    await expect(
      page.getByTestId("investigate-rep-and-crisis-links"),
    ).toContainText(/Find a VA-accredited representative/i);
    await expect(
      page.getByTestId("investigate-rep-and-crisis-links"),
    ).toContainText(/988/);
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");

    // 2. Load 1997-06-20 FR Pub-vs-Effective Gap Trap scenario (auto-opens Stage 4 Summary)
    await page.getByTestId("preset-preset-1997-pub-gap-trap").click();
    await expect(
      page.getByText(/Publication Date vs\. Effective Date Boundary Active/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "/cfr/38-cfr-4.56/1946-04-01" }).first(),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/investigate");
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");

    // 2b. Load full-corpus 1995 stabilized reduction scenario (E5-S6) and verify zero URL/network leak
    await page.getByTestId("preset-preset-1995-void-stabilized-reduction").click();
    await expect(
      page.getByTestId("pathway-card-unlawful-reduction-3-344-3-951-3-957"),
    ).toContainText(/Supported Clues Present/i);
    expect(new URL(page.url()).pathname).toBe("/investigate");
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");

    // 3. Reset to blank ("I'm Not Sure") at Stage 1, verify empty date re-locks Stage 1 without wiping answers, then enter 1974-08-12 and advance to Stage 4 Summary
    await page.getByTestId("preset-preset-blank-not-sure").click();
    await expect(page.locator("#investigate-decision-date")).toHaveValue("");
    await expect(page.getByTestId("stage-next-btn")).toBeDisabled();
    await page.getByTestId("gate-bva-subsumed-yes").click();
    await expect(
      page.getByText(/Enter a YYYY-MM-DD date/i),
    ).toBeVisible();
    await page.locator("#investigate-decision-date").fill("1974-08-12");
    await page.getByTestId("gate-prior-bva-cue-yes").click();

    await page.getByTestId("stage-next-btn").click();
    await page
      .getByTestId("fact-official_service_or_surgical_records_missing_at_t0-yes")
      .click();
    await page
      .getByTestId("fact-newly_associated_records_speak_to_disputed_element-yes")
      .click();

    await page.getByTestId("stage-tab-4").click();

    // Verify § 3.156(c) stays supported while RO CUE & Board CUE explain exact bars
    await expect(
      page.getByTestId("pathway-card-service-records-3-156c"),
    ).toContainText(/Supported Clues Present/i);
    await expect(page.getByTestId("pathway-card-ro-cue-3-105a")).toContainText(
      /Does Not Match Current Answers/i,
    );
    await expect(
      page.getByTestId("pathway-card-board-cue-7111-subpart-o"),
    ).toContainText(/20\.1409\(c\)/i);

    // 4. Open Veteran Discussion Sheet preview & download .md purely on-device
    await page.getByRole("button", { name: /Preview Exported Markdown/i }).click();
    await expect(page.getByTestId("packet-markdown-preview")).toContainText(
      /Representative Discussion & Records Sheet/i,
    );
    await expect(page.getByTestId("packet-markdown-preview")).toContainText(
      /corpus-w[1-5]-/i,
    );
    await expect(page.getByTestId("packet-markdown-preview")).toContainText(
      "https://www.va.gov/get-help-from-accredited-representative/find-rep/",
    );
    await expect(page.getByTestId("packet-markdown-preview")).toContainText(
      /988/,
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Discussion Sheet/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(
      "vetlawguide-representative-discussion-",
    );

    // 5. Switch to Practitioners mode and verify Practitioner Pre-Filing Packet preview
    await page.getByRole("button", { name: "Practitioners" }).click();
    await expect(page.getByTestId("packet-markdown-preview")).toContainText(
      /Pre-Filing C-File Audit & Bitemporal Gate Packet/i,
    );

    // 6. Verify strict zero external network, zero GTM script injection, zero runtime XHR/fetch/beacon, zero URL leak, and zero storage leak
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
    expect(externalRequests).toEqual([]);
    expect(postLoadRuntimeRequests).toEqual([]);
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");

    const storageKeys = await page.evaluate(() => ({
      localKeys: Object.keys(window.localStorage),
      sessionKeys: Object.keys(window.sessionStorage),
    }));
    expect(storageKeys.sessionKeys).toEqual([]);
    for (const key of storageKeys.localKeys) {
      expect(["vlg_audience_mode", "theme", "vlg-theme"]).toContain(key);
    }
  });

  test("ChatWidget fires zero network calls prior to submit, blocks SSNs client-side, and never leaks /investigate browser-memory answers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/investigate", { waitUntil: "networkidle" });

    // Enter private screening answers in /investigate browser memory
    await page.getByTestId("preset-preset-blank-not-sure").click();
    await page.locator("#investigate-decision-date").fill("1974-08-12");
    await page.getByTestId("gate-bva-subsumed-yes").click();

    const postOpenRequests: string[] = [];
    page.on("request", (req) => {
      const raw = req.url();
      if (raw.startsWith("blob:") || raw.startsWith("data:")) return;
      postOpenRequests.push(`${req.method()} ${new URL(raw).pathname}`);
    });

    // 1. Opening ChatWidget, clicking an example prompt, and expanding fires ZERO network calls
    await page.getByTestId("chat-widget-launcher").click();
    await expect(page.getByTestId("chat-widget-panel")).toBeVisible();
    await expect(page.getByTestId("chat-investigate-isolation-note")).toBeVisible();
    await expect(page.getByTestId("chat-privacy-and-crisis-strip")).toContainText(
      /Veterans Crisis Line: dial 988 then press 1, or text 838255/i,
    );
    await expect(page.getByTestId("chat-privacy-and-crisis-strip")).toContainText(
      /Find a VA-accredited representative/i,
    );
    await page.getByRole("button", { name: /38 C\.F\.R\. § 3\.156\(c\)/i }).click();
    await page.getByRole("button", { name: "Expand chat window" }).click();
    await page.getByRole("button", { name: "Shrink chat window" }).click();
    expect(postOpenRequests).toEqual([]);

    // 2. Client-side PII firewall blocks SSN before fetch("/api/chat") ever fires
    const syntheticSsn = ["123", "45", "6789"].join("-");
    await page.locator("#vlg-chat-input").fill(`My SSN is ${syntheticSsn}`);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("chat-pii-warning")).toContainText(
      /Social Security Numbers/i,
    );
    expect(postOpenRequests).toEqual([]);

    // 3. Submitting a clean question streams grounded Markdown links AND sends zero /investigate state
    let capturedChatPayload: Record<string, unknown> | null = null;
    await page.route("**/api/chat", async (route) => {
      capturedChatPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: "Under [38 C.F.R. § 3.156(c)](/cfr/38-cfr-3.156c), VA reconsiders a claim when official service department records are associated.",
      });
    });

    await page
      .locator("#vlg-chat-input")
      .fill("How does 38 C.F.R. § 3.156(c) handle missing service records?");
    await page.getByRole("button", { name: "Send message" }).click();

    const streamedLink = page
      .getByTestId("chat-widget-panel")
      .locator('a[href="/cfr/38-cfr-3.156c"]');
    await expect(streamedLink).toBeVisible();

    expect(capturedChatPayload).not.toBeNull();
    expect(Object.keys(capturedChatPayload!).sort()).toEqual([
      "audienceMode",
      "conversationId",
      "decisionDate",
      "messages",
    ]);
    // Verify /investigate's private 1974-08-12 date & gate answers were NEVER injected into chat
    expect(capturedChatPayload!.decisionDate).toBeNull();
    expect(JSON.stringify(capturedChatPayload)).not.toContain("1974-08-12");
    expect(JSON.stringify(capturedChatPayload)).not.toContain("bva");
  });
});
