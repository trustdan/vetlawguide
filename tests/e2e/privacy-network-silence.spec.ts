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
    await expect(page.locator("script#vlg-gtm-script")).toHaveAttribute(
      "src",
      /googletagmanager\.com\/gtm\.js\?id=GTM-W9T68MCQ/,
    );
    expect(unexpectedExternalRequests).toEqual([]);
    expect(new URL(page.url()).search).toBe("");
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

    await page.goto("/investigate", { waitUntil: "networkidle" });

    // Record ANY network request (XHR, fetch, beacon, pixel image, script, websocket) fired AFTER /investigate hydration
    page.on("request", (req) => {
      const raw = req.url();
      if (raw.startsWith("blob:") || raw.startsWith("data:")) return;
      postLoadRuntimeRequests.push(`${req.resourceType()}:${req.method()} ${raw}`);
    });

    // 1. Default blank session keeps all candidate pathways alive and shows priority records
    await expect(page.getByTestId("records-to-locate-section")).toContainText(
      /NPRC Inpatient Clinical/i,
    );
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");

    // 2. Load 1997-06-20 FR Pub-vs-Effective Gap Trap scenario
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

    // 3. Reset to blank ("I'm Not Sure"), answer three-valued questions interactively, and check BVA gates
    await page.getByTestId("preset-preset-blank-not-sure").click();
    await page
      .getByTestId("fact-official_service_or_surgical_records_missing_at_t0-yes")
      .click();
    await page
      .getByTestId("fact-newly_associated_records_speak_to_disputed_element-yes")
      .click();
    await page.getByTestId("gate-bva-subsumed-yes").click();
    await page.getByTestId("gate-prior-bva-cue-yes").click();

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
});
