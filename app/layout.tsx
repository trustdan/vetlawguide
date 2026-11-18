import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ChatWidget } from "@/components/chrome/chat-widget";
import { GitHubCorner } from "@/components/chrome/github-corner";
import { GoogleTagManager } from "@/components/chrome/google-tag-manager";
import { OpenChatLink } from "@/components/chrome/open-chat-link";
import { SiteHeader } from "@/components/chrome/site-header";
import {
  ConsentProvider,
  CookieSettingsButton,
} from "@/components/providers/consent-provider";
import { ResearchProvider } from "@/components/providers/research-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getCoverageManifest, getSearchEngineCatalog } from "@/lib/corpus/loader";
import { SITE_NAME, SITE_URL } from "@/lib/seo/metadata";

const newsreader = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
      style: "normal",
      weight: "200 800",
    },
    {
      path: "../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2",
      style: "italic",
      weight: "200 800",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
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
    <html
      lang="en"
      data-mode="veteran"
      suppressHydrationWarning
      className={`${newsreader.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ZERO_FLASH_MODE_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <ConsentProvider>
          <GoogleTagManager />
          <ThemeProvider>
            <ResearchProvider>
              <GitHubCorner />
              <SiteHeader searchCatalog={searchCatalog} />
              <div className="flex-1">{children}</div>
              <footer className="border-t border-border bg-surface pt-6 pb-28 text-xs text-muted-foreground sm:pb-24">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="font-semibold text-foreground">
                        VetLawGuide
                      </strong>{" "}
                      · Educational reference only. Not legal advice.
                    </div>
                    <div className="font-mono text-xs">
                      {manifest.totals.upstreamModules} primary-source modules ·{" "}
                      {manifest.vasrdSystems.length} rating-schedule hubs ·
                      checked {manifest.checkedAsOf}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5">
                    <Link
                      href="/explore/diagnostic-codes"
                      prefetch={false}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Diagnostic code index
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link
                      href="/explore/cfr-directory"
                      prefetch={false}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      38 C.F.R. permalink index
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link
                      href="/privacy"
                      prefetch={false}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Privacy
                    </Link>
                    <span aria-hidden="true">·</span>
                    <CookieSettingsButton />
                    <span aria-hidden="true">·</span>
                    <OpenChatLink className="underline underline-offset-2 hover:text-foreground">
                      Research chat
                    </OpenChatLink>
                  </div>
                </div>
              </footer>
              <ChatWidget />
            </ResearchProvider>
          </ThemeProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}
