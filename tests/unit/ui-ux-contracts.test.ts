import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_SITUATION_CARDS } from "@/content/situations";

const REPO_ROOT = resolve(__dirname, "..", "..");

function parseCssBlockVars(css: string, selector: ":root" | ".dark"): Record<string, string> {
  const escaped = selector.replace(".", "\\.");
  const blockMatch = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  expect(blockMatch, `Missing ${selector} block in app/globals.css`).not.toBeNull();
  const vars: Record<string, string> = {};
  for (const m of blockMatch![1]!.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    vars[m[1]!] = m[2]!.trim();
  }
  return vars;
}

function hexLuminance(hex: string): number {
  const clean = hex.trim().replace(/^#/, "");
  expect(clean).toMatch(/^[0-9a-fA-F]{6}$/);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = hexLuminance(fgHex);
  const l2 = hexLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("EPIC 10 & EPIC 12 Editorial Visual System, Gateways & Octocat Contracts", () => {
  it("enforces WCAG 2.2 AA+ (>= 4.5:1) contrast across warm light and neutral charcoal .dark tokens", () => {
    const css = readFileSync(resolve(REPO_ROOT, "app", "globals.css"), "utf8");
    const light = parseCssBlockVars(css, ":root");
    const dark = parseCssBlockVars(css, ".dark");

    // Verify neutral charcoal dark surfaces per ADR-0007
    expect(dark["background"]?.toLowerCase()).toBe("#17181a");
    expect(dark["surface"]?.toLowerCase()).toBe("#1f2023");
    expect(dark["surface-elevated"]?.toLowerCase()).toBe("#26282c");
    expect(dark["muted"]?.toLowerCase()).toBe("#2e3035");
    expect(dark["primary"]?.toLowerCase()).toBe("#9db8dc");

    for (const surfaceKey of ["background", "surface", "surface-elevated", "muted"] as const) {
      expect(
        contrastRatio(light["foreground"]!, light[surfaceKey]!),
        `Light foreground on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(light["muted-foreground"]!, light[surfaceKey]!),
        `Light muted-foreground on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(light["primary"]!, light[surfaceKey]!),
        `Light primary on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(4.5);

      expect(
        contrastRatio(dark["foreground"]!, dark[surfaceKey]!),
        `Dark foreground on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(dark["muted-foreground"]!, dark[surfaceKey]!),
        `Dark muted-foreground on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(dark["primary"]!, dark[surfaceKey]!),
        `Dark primary on ${surfaceKey}`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    expect(contrastRatio(light["accent-foreground"]!, light["accent"]!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark["accent-foreground"]!, dark["accent"]!)).toBeGreaterThanOrEqual(4.5);

    // 13px (0.8125rem) floor on text-xs
    expect(css).toContain("--text-xs: 0.8125rem");
    expect(css).toContain("@keyframes octocatWave");
  });

  it("self-hosts Newsreader, Geist Sans, and Geist Mono with zero Google Fonts network calls and includes app/icon.svg", () => {
    const layoutSrc = readFileSync(resolve(REPO_ROOT, "app", "layout.tsx"), "utf8");
    expect(layoutSrc).not.toContain("next/font/google");
    expect(layoutSrc).not.toContain("fonts.googleapis.com");
    expect(layoutSrc).toContain("GeistSans");
    expect(layoutSrc).toContain("GeistMono");
    expect(layoutSrc).toContain("newsreader");

    const iconPath = resolve(REPO_ROOT, "app", "icon.svg");
    expect(existsSync(iconPath)).toBe(true);
    const iconSvg = readFileSync(iconPath, "utf8");
    expect(iconSvg).toContain("<svg");
  });

  it("ships all 9 optimized <25 KB cut-paper WebP illustrations, prunes raw docs/ux/*.jpeg masters, and fixes situation routing", () => {
    const allIllustrationSlugs = [
      "browse-topics",
      "disability-ratings",
      "investigate-decision",
      "law-and-cases",
      "guides",
      "survivor-benefits",
      "forms-decoder",
      "crosswalk",
      "timeline",
    ];
    for (const slug of allIllustrationSlugs) {
      const p = resolve(REPO_ROOT, "public", "illustrations", `${slug}.webp`);
      expect(existsSync(p), `Missing illustration asset public/illustrations/${slug}.webp`).toBe(
        true,
      );
      const sizeBytes = statSync(p).size;
      expect(sizeBytes).toBeGreaterThan(500);
      expect(sizeBytes, `${slug}.webp exceeds 25 KB budget`).toBeLessThan(25_600);
    }

    const uxFiles = readdirSync(resolve(REPO_ROOT, "docs", "ux"));
    expect(
      uxFiles.filter((f) => /\.(?:jpe?g|png)$/i.test(f)),
      "Raw multi-MB JPEG/PNG masters or -alternate files must be pruned from docs/ux/",
    ).toEqual([]);

    const ratingsCard = CORE_SITUATION_CARDS.find((c) => c.id === "research-vasrd-rating");
    const survivorCard = CORE_SITUATION_CARDS.find((c) => c.id === "survivor-dic-accrued");
    expect(ratingsCard?.href).toBe("/vasrd");
    expect(survivorCard?.href).toBe("/explore#survivor-benefits");
  });

  it("enforces EPIC 11 Browse Directory default, /explore single-job cleanup, /investigate 3-block summary, and single-column reader hierarchy", () => {
    const exploreSrc = readFileSync(
      resolve(REPO_ROOT, "app", "explore", "page.tsx"),
      "utf8",
    );
    expect(exploreSrc).not.toContain("<table");
    expect(exploreSrc).not.toContain("getCompiledLexicon");

    const treeSrc = readFileSync(
      resolve(REPO_ROOT, "components", "bitemporal", "osint-knowledge-tree.tsx"),
      "utf8",
    );
    expect(treeSrc).toContain('useState<"directory" | "map">("directory")');

    const invSrc = readFileSync(
      resolve(REPO_ROOT, "components", "investigate", "investigation-workspace.tsx"),
      "utf8",
    );
    expect(invSrc).toContain("What you know");
    expect(invSrc).toContain("Records to find");
    expect(invSrc).toContain("Questions to discuss");
    expect(invSrc).not.toMatch(/\b(?:fetch|navigator\.sendBeacon|router\.push|history\.replaceState)\b/);

    const readerSrc = readFileSync(
      resolve(REPO_ROOT, "components", "bitemporal", "three-column-reader.tsx"),
      "utf8",
    );
    expect(readerSrc).toContain("lg:col-span-8");
    expect(readerSrc).toContain("lg:col-span-4");
  });

  it("uses the authentic Ideation-Lab-Web diagonal Octocat silhouette with non-blocking pointer-events", () => {
    const ghSrc = readFileSync(
      resolve(REPO_ROOT, "components", "chrome", "github-corner.tsx"),
      "utf8",
    );
    expect(ghSrc).toContain('viewBox="0 0 250 250"');
    expect(ghSrc).toContain("M115.0,115.0");
    expect(ghSrc).toContain("M128.3,109.0");
    expect(ghSrc).toContain('transformOrigin: "130px 106px"');
    expect(ghSrc).toContain("pointer-events-none");
    expect(ghSrc).toContain("pointer-events-auto");
    expect(ghSrc).not.toMatch(/emerald|#[0-9a-fA-F]{3,8}/);
  });
});
