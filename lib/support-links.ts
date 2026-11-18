/**
 * Canonical zero-network support resources, GitHub issue-form URL builder,
 * and 404 CFR section fallback resolver.
 *
 * Pure TypeScript module (zero React, Next.js, or Node.js imports).
 */

export const VETERANS_CRISIS_LINE_URL = "https://www.veteranscrisisline.net/";

export const VETERANS_CRISIS_LINE_COPY =
  "Veterans Crisis Line: dial 988 then press 1, or text 838255.";

export const VA_FIND_ACCREDITED_REP_URL =
  "https://www.va.gov/get-help-from-accredited-representative/find-rep/";

export const GITHUB_ISSUES_NEW_URL =
  "https://github.com/trustdan/vetlawguide/issues/new";

export const CITATION_OR_DATE_FIX_TEMPLATE = "citation-or-date-fix.yml";

export interface CitationFixIssueParams {
  /** Static canonical route path (e.g. "/cfr/38-cfr-4.56/1946-04-01"). */
  canonicalPath: string;
  /** Corpus version stamp (e.g. "corpus-w5-2026-11-17"). */
  corpusReleaseId: string;
  /** Official section, statute, case, or hub citation string. */
  authority: string;
}

/**
 * Builds a deterministic GitHub Issue Form deep-link pre-filling ONLY static
 * corpus metadata (`authority` and `page_or_version`).
 *
 * Safety invariants:
 * - Strips any URL query parameters or hash fragments from `canonicalPath`.
 * - Returns `null` for `/investigate` routes so screening sessions never emit
 *   prefilled issue links.
 * - Never includes user Decision Date, audience mode, or `zero_pii_confirm`
 *   (keeping the GitHub form's zero-PII confirmation checkbox required).
 */
export function buildCitationFixIssueUrl({
  canonicalPath,
  corpusReleaseId,
  authority,
}: CitationFixIssueParams): string | null {
  const cleanPath = (canonicalPath.split(/[?#]/)[0] ?? "").trim();
  if (!cleanPath.startsWith("/") || cleanPath.startsWith("/investigate")) {
    return null;
  }

  const normalizedPath =
    cleanPath.length > 1 ? cleanPath.replace(/\/+$/, "") : cleanPath;
  const cleanRelease = corpusReleaseId.trim();
  const cleanAuthority = authority.trim();
  if (!cleanAuthority) {
    return null;
  }

  const pageOrVersion = cleanRelease
    ? `${normalizedPath} (${cleanRelease})`
    : normalizedPath;

  const params = new URLSearchParams();
  params.set("template", CITATION_OR_DATE_FIX_TEMPLATE);
  params.set("authority", cleanAuthority);
  params.set("page_or_version", pageOrVersion);

  return `${GITHUB_ISSUES_NEW_URL}?${params.toString()}`;
}

export interface CfrSectionSummaryRef {
  sectionSlug: string;
  cfrSection: string;
}

export interface CfrSectionFallbackMatch {
  sectionSlug: string;
  cfrSection: string;
  requestedSegment: string;
  href: string;
}

/**
 * Detects unmatched `/cfr/[section]/[effectiveFrom]` URLs on 404 boundaries
 * and resolves the parent `/cfr/[section]` hub when `[section]` is a known
 * compiled CFR section slug.
 */
export function extractCfrSectionFallbackFromPath(
  pathname: string | null | undefined,
  validSections: ReadonlyArray<CfrSectionSummaryRef>,
): CfrSectionFallbackMatch | null {
  if (!pathname) return null;
  const cleanPath = pathname.split(/[?#]/)[0] ?? "";
  const match = /^\/cfr\/([^/]+)\/([^/]+)\/?$/.exec(cleanPath);
  if (!match) return null;

  const candidateSlug = decodeURIComponent(match[1] ?? "").toLowerCase();
  const requestedSegment = decodeURIComponent(match[2] ?? "");
  if (!candidateSlug || candidateSlug === "modules" || !requestedSegment) {
    return null;
  }

  const found = validSections.find(
    (s) => s.sectionSlug.toLowerCase() === candidateSlug,
  );
  if (!found) return null;

  return {
    sectionSlug: found.sectionSlug,
    cfrSection: found.cfrSection,
    requestedSegment,
    href: `/cfr/${found.sectionSlug}`,
  };
}
