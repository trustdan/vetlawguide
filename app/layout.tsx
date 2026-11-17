import type { Metadata } from "next";
import "./globals.css";
import { GitHubCorner } from "@/components/chrome/github-corner";
import { GoogleTagManager } from "@/components/chrome/google-tag-manager";
import { SiteHeader } from "@/components/chrome/site-header";
import { ResearchProvider } from "@/components/providers/research-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getCoverageManifest, getSearchEngineCatalog } from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: {
    default: "VetLawGuide — Point-in-Time Veterans Law Research Desk",
    template: "%s | VetLawGuide",
  },
  description:
    "Connect VA rating and Board decisions, historical and current 38 C.F.R. / Title 38 authorities, and concrete records to locate—with inspectable primary sources.",
};

const ZERO_FLASH_MODE_SCRIPT = `
(function() {
  try {
    var saved = window.localStorage.getItem('vlg_audience_mode');
    document.documentElement.dataset.mode = saved === 'practitioner' ? 'practitioner' : 'veteran';
  } catch (e) {
    document.documentElement.dataset.mode = 'veteran';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchCatalog = getSearchEngineCatalog();
  const manifest = getCoverageManifest();

  return (
    <html lang="en" data-mode="veteran" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ZERO_FLASH_MODE_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <GoogleTagManager />
        <ThemeProvider>
          <ResearchProvider>
            <GitHubCorner />
            <SiteHeader searchCatalog={searchCatalog} />
            <div className="flex-1">{children}</div>
            <footer className="border-t border-border bg-surface py-6 text-xs text-muted-foreground">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
                <div>
                  <strong className="font-semibold text-foreground">
                    VetLawGuide
                  </strong>{" "}
                  · Educational Reference Only (Not Legal Advice)
                </div>
                <div className="font-mono text-[11px]">
                  Pinned Release: {manifest.corpusReleaseId} · Bookmark:{" "}
                  {manifest.activeBookmarkWave} ({manifest.totals.upstreamModules}{" "}
                  verified modules live · {manifest.vasrdSystems.length} VASRD hubs) ·
                  Checked {manifest.checkedAsOf}
                </div>
              </div>
            </footer>
          </ResearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
