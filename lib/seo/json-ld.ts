import type {
  CompiledCfrSection,
  CompiledCfrSnapshot,
  CompiledDocument,
} from "@/lib/corpus/types";
import {
  HAS_ACCREDITED_EXTERNAL_REVIEW,
  SITE_MAINTAINER,
} from "@/lib/editorial-accountability";
import { SITE_NAME, SITE_URL } from "./metadata";

/**
 * Serializes a JSON-LD object safely for inline `<script type="application/ld+json">`,
 * escaping `<`, `>`, and `&` to prevent script-breakout XSS (E9-S3).
 */
export function serializeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Educational point-in-time U.S. Veterans Benefits Law reference library covering Title 38 U.S.C., historical and current 38 C.F.R. regulations, VASRD Diagnostic Codes (DC 5000–9918), and VA precedents.",
    inLanguage: "en-US",
    isAccessibleForFree: true,
  };
}

export function buildBreadcrumbJsonLd(
  crumbs: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.path === "/" ? SITE_URL : `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function buildCfrLegislationJsonLd(
  section: CompiledCfrSection,
  snapshot: CompiledCfrSnapshot,
  checkedAsOf: string,
) {
  const isQuarantined =
    snapshot.regulatory_status === "proposed-nonbinding" ||
    snapshot.regulatory_status === "interim-final-rescinded";

  const openEnded = !snapshot.effective_to || snapshot.effective_to === "present";
  const temporalCoverage = isQuarantined
    ? undefined
    : openEnded
      ? `${snapshot.effective_from}/..`
      : `${snapshot.effective_from}/${snapshot.effective_to}`;

  const isCurrentlyInForce =
    !isQuarantined &&
    (openEnded || snapshot.effective_to! >= checkedAsOf) &&
    snapshot.effective_from <= checkedAsOf;

  return {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: isQuarantined
      ? `${snapshot.cfr_section} — ${snapshot.heading ?? section.title} (Quarantined Notice — Not Enacted Law)`
      : `${snapshot.cfr_section} — ${snapshot.heading ?? section.title}`,
    legislationType: "Regulation",
    legislationIdentifier: snapshot.cfr_section,
    legislationDate: isQuarantined
      ? (snapshot.publication_date ?? snapshot.effective_from)
      : snapshot.effective_from,
    datePublished: snapshot.publication_date ?? snapshot.effective_from,
    dateModified: checkedAsOf,
    ...(temporalCoverage ? { temporalCoverage } : {}),
    legislationLegalForce: isCurrentlyInForce ? "InForce" : "NotInForce",
    legislationJurisdiction: "US",
    url: `${SITE_URL}${snapshot.permalink}`,
    isPartOf: {
      "@type": "Legislation",
      name: "Title 38, Code of Federal Regulations (Pensions, Bonuses, and Veterans' Relief)",
      url: section.officialEcfrUrl,
    },
    description: isQuarantined
      ? `Quarantined Federal Register notice (${snapshot.federal_register_citation ?? snapshot.version_id}) — proposed, unfinalized, or rescinded; not enacted law.`
      : section.summary,
  };
}

export function buildArticleJsonLd(
  doc: CompiledDocument,
  checkedAsOf: string,
) {
  const lastReviewed = doc.veteranOverlay?.reviewed_at ?? checkedAsOf;
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: doc.title,
    ...(doc.veteranOverlay?.plain_english_title
      ? { alternativeHeadline: doc.veteranOverlay.plain_english_title }
      : {}),
    description: doc.veteranOverlay?.what_this_means ?? doc.title,
    url: `${SITE_URL}${doc.route}`,
    dateModified: lastReviewed,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: SITE_MAINTAINER.publicLabel,
      jobTitle: SITE_MAINTAINER.role,
      url: SITE_MAINTAINER.githubProfileUrl,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    about: [
      ...doc.cfrCitations.slice(0, 4),
      ...doc.statutes.slice(0, 3),
      ...doc.diagnosticCodes.slice(0, 3).map((dc) => `Diagnostic Code ${dc}`),
    ],
  };

  // Never emit `reviewedBy` unless an accredited reviewer has actually reviewed content (E14-S1).
  if (HAS_ACCREDITED_EXTERNAL_REVIEW) {
    payload.reviewedBy = {
      "@type": "Organization",
      name: SITE_NAME,
    };
  }

  return payload;
}

export function buildAboutPageJsonLd(checkedAsOf: string) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE_NAME}`,
    url: `${SITE_URL}/about`,
    dateModified: checkedAsOf,
    inLanguage: "en-US",
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      founder: {
        "@type": "Person",
        name: SITE_MAINTAINER.publicLabel,
        jobTitle: SITE_MAINTAINER.role,
        url: SITE_MAINTAINER.githubProfileUrl,
      },
    },
  };
}

export function buildDefinedTermSetJsonLd(options: {
  name: string;
  description: string;
  canonicalPath: string;
  terms: ReadonlyArray<{
    termCode: string;
    name: string;
    description: string;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: options.name,
    description: options.description,
    url: `${SITE_URL}${options.canonicalPath}`,
    inLanguage: "en-US",
    hasDefinedTerm: options.terms.map((t) => ({
      "@type": "DefinedTerm",
      termCode: t.termCode,
      name: t.name,
      description: t.description,
      inDefinedTermSet: `${SITE_URL}${options.canonicalPath}`,
    })),
  };
}
