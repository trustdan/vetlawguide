import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/providers/consent-provider";
import { getCoverageManifest } from "@/lib/corpus/loader";
import {
  CHAT_QUESTIONS_RETENTION_DAYS,
  SITE_MAINTAINER,
} from "@/lib/editorial-accountability";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy, Cookie Choices & On-Device Investigation Isolation",
  description:
    "How VetLawGuide keeps your Investigate screening answers strictly in browser memory, gates public-page Google Analytics on consent, and scrubs PII in research chat.",
  canonicalPath: "/privacy",
  ogEyebrow: "Privacy & On-Device Data Handling",
});

export default function PrivacyPage() {
  const manifest = getCoverageManifest();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Privacy &amp; Data Handling · Reviewed {manifest.checkedAsOf}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Privacy, Cookie Choices &amp; On-Device Isolation
        </h1>
        <p className="mt-3 editorial-prose text-muted-foreground">
          VetLawGuide is an educational Veterans Law reference desk—not a law
          firm, claims intake portal, or medical service. We separate private
          decision-investigation worksheets from public reference browsing so
          sensitive claim clues never leave your browser.
        </p>
      </header>

      <div className="mt-8 space-y-8 editorial-prose">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            1. Strictly On-Device Investigate Workspace (Zero Network Transmission)
          </h2>
          <p className="text-foreground">
            When you use the{" "}
            <Link
              href="/investigate"
              prefetch={false}
              className="font-medium text-primary underline underline-offset-2"
            >
              Investigate workspace
            </Link>
            , every decision date, disability selection, and{" "}
            <em>Yes / No / I&apos;m not sure</em> screening answer stays{" "}
            <strong>strictly inside your browser&apos;s temporary memory</strong>:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>
              <strong>Zero network calls:</strong> Screening answers and
              downloaded discussion sheets are computed locally in TypeScript and
              are never transmitted to any server, database, or AI model.
            </li>
            <li>
              <strong>Zero URL query serialization:</strong> Screening answers
              are never written into page URLs, browser history query strings, or{" "}
              <code className="font-mono text-xs">localStorage</code>.
            </li>
            <li>
              <strong>Unconditional analytics blackout:</strong> Google Tag
              Manager and Google Analytics scripts are unmounted on{" "}
              <code className="font-mono text-xs">/investigate</code> regardless
              of your cookie preferences, enforced by a route-specific{" "}
              <code className="font-mono text-xs">
                Content-Security-Policy (connect-src &apos;self&apos;)
              </code>{" "}
              and automated browser tests.
            </li>
            <li>
              <strong>Chat isolation:</strong> Opening the research chat widget
              never reads or imports answers from the Investigate workspace.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            2. Grounded Corpus Research Chat &amp; PII Redaction
          </h2>
          <p className="text-foreground">
            The floating <strong>Chat</strong> assistant makes{" "}
            <strong>zero network requests</strong> until you type and submit a
            question. When you submit a chat message:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>
              <strong>Client &amp; server PII firewall:</strong> Obvious Social
              Security Numbers, VA claim/file numbers, and military ID numbers
              are blocked in the browser before sending, and a server-side{" "}
              <code className="font-mono text-xs">redactPii()</code> scrubber
              replaces SSNs, claim numbers, email addresses, and phone numbers
              with <code className="font-mono text-xs">[REDACTED-*]</code>{" "}
              tokens before model invocation or storage. Even so, please never
              enter names, DD-214 details, or private medical facts.
            </li>
            <li>
              <strong>Zero-training commercial API tier:</strong> Grounded
              answers are generated via OpenAI&apos;s paid commercial API tier (
              <code className="font-mono text-xs">gpt-5-nano</code> with{" "}
              <code className="font-mono text-xs">store: false</code>), which
              does not train models on API inputs or outputs.
            </li>
            <li>
              <strong>User-question-only aggregate logging:</strong> Only
              PII-scrubbed user questions (AI assistant responses are never
              stored), together with your active{" "}
              <code className="font-mono text-xs">Veterans | Practitioners</code>{" "}
              display mode, optional{" "}
              <code className="font-mono text-xs">YYYY-MM-DD</code> law date,
              and top matched guide route, may be stored in a
              Row-Level-Security-locked database table so we can spot missing
              Diagnostic Codes, confusing acronyms, and frequent research
              questions. Without analytics consent, chat uses only a temporary
              per-tab identifier rather than a persistent cookie.
            </li>
            <li>
              <strong>
                {CHAT_QUESTIONS_RETENTION_DAYS}-day retention &amp; automatic
                purge:
              </strong>{" "}
              Logged user questions in{" "}
              <code className="font-mono text-xs">chat_questions</code> are
              retained for{" "}
              <strong>{CHAT_QUESTIONS_RETENTION_DAYS} days</strong> and
              automatically deleted once older than{" "}
              {CHAT_QUESTIONS_RETENTION_DAYS} days.
            </li>
            <li>
              <strong>How deletion requests work:</strong> Because stored
              questions are PII-scrubbed and{" "}
              <strong>
                never linked to a user account, name, email address, or IP
                address
              </strong>
              , we cannot look up rows by personal identity. If you want an
              earlier chat question removed before the{" "}
              {CHAT_QUESTIONS_RETENTION_DAYS}-day automatic purge, submit a
              request via{" "}
              <a
                href={SITE_MAINTAINER.githubIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                our GitHub contact channel
              </a>{" "}
              with the approximate UTC date/time window (or browser{" "}
              <code className="font-mono text-xs">conversationId</code> if
              known)—and never include SSNs or private claim numbers in your
              request.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            3. Local Browser Preferences &amp; Public-Page Analytics
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>
              <strong>Necessary display preferences:</strong> Your chosen
              reading mode (<code className="font-mono text-xs">vlg_audience_mode</code>
              : Veterans or Practitioners), light/dark theme (
              <code className="font-mono text-xs">theme</code>), and cookie
              choice (<code className="font-mono text-xs">vlg_consent</code>)
              are stored locally so pages render without visual flashing.
            </li>
            <li>
              <strong>Optional public-page analytics:</strong> On public
              reference pages outside{" "}
              <code className="font-mono text-xs">/investigate</code>, Google
              Tag (<code className="font-mono text-xs">GTM-W9T68MCQ</code>)
              measures aggregate page views using pathname-only URLs (query
              strings stripped, advertising and personalization signals denied)
              only when you opt in. Opting out immediately revokes consent and
              deletes <code className="font-mono text-xs">_ga*</code> and chat
              session cookies.
            </li>
          </ul>
          <div className="pt-2">
            <CookieSettingsButton className="rounded-md border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">
            Educational Reference Disclaimer:
          </strong>{" "}
          Nothing on VetLawGuide or in the research chat constitutes legal or
          medical advice, or creates an attorney-client or representative
          relationship. To review an individual VA claim or C-file, consult an{" "}
          <a
            href="https://www.va.gov/get-help-from-accredited-representative/find-rep/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            accredited VSO, claims agent, or Veterans Law attorney
          </a>
          .
        </section>
      </div>
    </main>
  );
}
