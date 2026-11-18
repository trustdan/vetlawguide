/**
 * Canonical editorial accountability, review-status honesty, and chat-question
 * retention constants shared across `/about`, `/privacy`, JSON-LD, and tests.
 *
 * Pure TypeScript module (zero React, Next.js, or Node.js imports).
 */

export const SITE_MAINTAINER = {
  name: "Dan",
  publicLabel: "Dan (trustdan)",
  role: "Founder & Independent Legal-Engineering Maintainer",
  githubProfileUrl: "https://github.com/trustdan",
  githubIssuesUrl: "https://github.com/trustdan/vetlawguide/issues",
} as const;

/**
 * Explicit review-status truth flag (E14-S1).
 * Must remain `false` unless and until a named VA-accredited attorney, claims
 * agent, or VSO representative formally reviews content and authorizes attribution.
 * When `false`, JSON-LD builders MUST NOT emit `reviewedBy`.
 */
export const HAS_ACCREDITED_EXTERNAL_REVIEW = false as const;

export const CORRECTION_SLA = {
  legalOrDateTriageHours: 48,
  legalOrDateFixBusinessDays: 5,
  copyOrLinkReviewBusinessDays: 10,
} as const;

/**
 * Retention window (in days) for PII-scrubbed user questions stored in
 * `public.chat_questions` (`supabase/migrations/0003_chat_questions_retention.sql`
 * and `/privacy`).
 */
export const CHAT_QUESTIONS_RETENTION_DAYS = 180 as const;
