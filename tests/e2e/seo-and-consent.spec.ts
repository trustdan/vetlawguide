import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("EPIC 9 — Canonical SEO, Schema.org Legal JSON-LD, Crawl Directories & Consent Lifecycle", () => {
  test("serves /robots.txt, /sitemap.xml, /llms.txt, and /og citation card with clean canonicals and JSON-LD", async ({
    page,
    request,
  }) => {
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain("Disallow: /api/");
    expect(robotsTxt).toContain("Sitemap: https://vetlawguide.com/sitemap.xml");

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("https://vetlawguide.com/cfr/38-cfr-4.56/1946-04-01");
    expect(sitemapXml).toContain("https://vetlawguide.com/explore/diagnostic-codes");
    expect(sitemapXml).toContain("https://vetlawguide.com/explore/cfr-directory");

    const llmsRes = await request.get("/llms.txt");
    expect(llmsRes.status()).toBe(200);
    const llmsTxt = await llmsRes.text();
    expect(llmsTxt).toContain("20.1409(c)");
    expect(llmsTxt).toContain("Rule 30(a)");

    const ogRes = await request.get(
      "/og?title=38%20C.F.R.%20%C2%A7%204.56&cite=DC%205301-5323",
    );
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()["content-type"]).toContain("image/png");

    // Block live GTM egress in offline runner
    await page.route("https://www.googletagmanager.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );

    // Query-variant URL (/cfr/38-cfr-4.56?date=1997-06-20) must consolidate canonical to clean path
    await page.goto("/cfr/38-cfr-4.56?date=1997-06-20");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://vetlawguide.com/cfr/38-cfr-4.56",
    );

    // Superseded historical permalink Legislation JSON-LD (NotInForce today, with exact historical temporalCoverage)
    await page.goto("/cfr/38-cfr-4.56/1946-04-01");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://vetlawguide.com/cfr/38-cfr-4.56/1946-04-01",
    );
    const cfrJsonLdRaw = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsedCfrLd = cfrJsonLdRaw.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const legislationNode = parsedCfrLd.find((n) => n["@type"] === "Legislation");
    expect(legislationNode).toBeDefined();
    expect(legislationNode?.legislationLegalForce).toBe("NotInForce");
    expect(String(legislationNode?.temporalCoverage)).toBe("1946-04-01/1997-07-02");

    // Current enacted permalink Legislation JSON-LD (InForce)
    await page.goto("/cfr/38-cfr-4.56/1997-07-03");
    const activeJsonLdRaw = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const activeNodes = activeJsonLdRaw.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const activeLeg = activeNodes.find((n) => n["@type"] === "Legislation");
    expect(activeLeg?.legislationLegalForce).toBe("InForce");

    // Quarantined permalink Legislation JSON-LD must report NotInForce with no enacted temporalCoverage
    await page.goto("/cfr/38-cfr-4.118/2025-09-29");
    const qJsonLdRaw = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const qNodes = qJsonLdRaw.map((raw) => JSON.parse(raw) as Record<string, unknown>);
    const qLeg = qNodes.find((n) => n["@type"] === "Legislation");
    expect(qLeg?.legislationLegalForce).toBe("NotInForce");
    expect(qLeg?.temporalCoverage).toBeUndefined();
  });

  test("crawl jump-directories and ConsentProvider opt-in/opt-out lifecycle pass WCAG 2.2 AA and preserve /investigate blackout", async ({
    page,
    context,
  }) => {
    await page.route("https://www.googletagmanager.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore/diagnostic-codes");

    // First-visit consent banner is visible on public pages
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();

    const dcScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(dcScan.violations).toEqual([]);

    // Opt into analytics -> stores vlg_consent with performance:true and hides banner
    await page.getByTestId("consent-accept-all").click();
    await expect(banner).toHaveCount(0);
    let cookies = await context.cookies();
    const acceptedConsent = cookies.find((c) => c.name === "vlg_consent");
    expect(acceptedConsent).toBeDefined();
    expect(decodeURIComponent(acceptedConsent!.value)).toContain('"performance":true');

    // Seed synthetic _ga cookie, then open Cookie Settings and switch to Necessary Only -> deletes _ga
    await context.addCookies([
      {
        name: "_ga",
        value: "GA1.1.999999999.1700000000",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.getByTestId("cookie-settings-trigger").click();
    const settingsDialog = page.getByTestId("consent-settings-dialog");
    await expect(settingsDialog).toBeVisible();

    const modalScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(modalScan.violations).toEqual([]);

    await settingsDialog.getByRole("button", { name: "Necessary only" }).click();
    await expect(settingsDialog).toHaveCount(0);

    cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "_ga")).toBeUndefined();
    const revokedConsent = cookies.find((c) => c.name === "vlg_consent");
    expect(decodeURIComponent(revokedConsent!.value)).toContain('"performance":false');

    // Re-enable analytics and verify /investigate STILL enforces an unconditional GTM blackout
    await page.getByTestId("cookie-settings-trigger").click();
    await page
      .getByTestId("consent-settings-dialog")
      .getByRole("button", { name: "Accept analytics" })
      .click();

    await page.goto("/investigate");
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);

    // Check /explore/cfr-directory WCAG 2.2 AA & 400% zoom reflow
    await page.goto("/explore/cfr-directory");
    const cfrDirScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(cfrDirScan.violations).toEqual([]);

    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
