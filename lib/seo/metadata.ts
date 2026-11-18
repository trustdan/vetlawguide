import type {
  CompiledCfrSection,
  CompiledCfrSnapshot,
  CompiledDocument,
  VasrdSystemCoverage,
} from "@/lib/corpus/types";

export const SITE_URL = "https://vetlawguide.com";
export const SITE_NAME = "VetLawGuide";

export interface SeoMetadataResult {
  title: string;
  description: string;
  alternates: {
    canonical: string;
  };
  openGraph: {
    type: "website" | "article";
    siteName: string;
    title: string;
    description: string;
    url: string;
    locale: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    images: string[];
  };
}

function cleanCanonicalPath(rawPath: string): string {
  const withoutQueryOrHash = rawPath.split("?")[0]!.split("#")[0]!.trim();
  if (!withoutQueryOrHash || withoutQueryOrHash === "/") return "/";
  const prefixed = withoutQueryOrHash.startsWith("/")
    ? withoutQueryOrHash
    : `/${withoutQueryOrHash}`;
  return prefixed.replace(/\/+$/, "");
}

function clampDescription(raw: string, maxLen = 160): string {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const sliced = normalized.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:\s-]+$/, "")}…`;
}

export function buildOgImageUrl(params: {
  title: string;
  eyebrow?: string;
  cite?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("title", params.title.slice(0, 110));
  if (params.eyebrow) sp.set("eyebrow", params.eyebrow.slice(0, 60));
  if (params.cite) sp.set("cite", params.cite.slice(0, 70));
  return `/og?${sp.toString()}`;
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: "website" | "article";
  ogEyebrow?: string;
  ogCite?: string;
}): SeoMetadataResult {
  const canonical = cleanCanonicalPath(options.canonicalPath);
  const description = clampDescription(options.description, 165);
  const ogUrl = buildOgImageUrl({
    title: options.title,
    eyebrow: options.ogEyebrow ?? "Point-in-Time Veterans Law Reference",
    cite: options.ogCite,
  });

  return {
    title: options.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: options.ogType ?? "website",
      siteName: SITE_NAME,
      title: options.title,
      description,
      url: canonical,
      locale: "en_US",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${options.title} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description,
      images: [ogUrl],
    },
  };
}

export function buildCfrSectionMetadata(
  section: CompiledCfrSection,
): SeoMetadataResult {
  const dcLabel =
    section.diagnosticCodes.length > 0
      ? ` (DC ${section.diagnosticCodes.slice(0, 2).join(", ")})`
      : "";
  const title = `${section.cfrSection} — ${section.title}${dcLabel}`;
  const plainLead = section.veteranOverlay
    ? section.veteranOverlay.what_this_means
    : section.summary;
  const description = `${section.cfrSection}${dcLabel}: ${plainLead} Compare ${section.versions.length} effective-date snapshot(s), Federal Register redlines, and primary sources.`;

  return buildPageMetadata({
    title,
    description,
    canonicalPath: `/cfr/${section.sectionSlug}`,
    ogType: "article",
    ogEyebrow: "Point-in-Time 38 C.F.R. Authority",
    ogCite: [
      section.cfrSection,
      section.diagnosticCodes[0] ? `DC ${section.diagnosticCodes[0]}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });
}

export function buildCfrSnapshotMetadata(
  section: CompiledCfrSection,
  snapshot: CompiledCfrSnapshot,
): SeoMetadataResult {
  const isQuarantined =
    snapshot.regulatory_status === "proposed-nonbinding" ||
    snapshot.regulatory_status === "interim-final-rescinded";

  const title = isQuarantined
    ? `${snapshot.cfr_section} (Quarantined / Not Enacted Notice ${snapshot.publication_date ?? snapshot.effective_from}) — ${snapshot.heading ?? section.title}`
    : `${snapshot.cfr_section} (Effective ${snapshot.effective_from}) — ${snapshot.heading ?? section.title}`;

  const description = isQuarantined
    ? `Quarantined Federal Register notice (${snapshot.federal_register_citation ?? snapshot.version_id}): proposed, unfinalized, or rescinded — not enacted law for ${section.cfrSection}.`
    : `Point-in-time ${snapshot.cfr_section} snapshot effective ${snapshot.effective_from} to ${snapshot.effective_to ?? "present"}${
        snapshot.federal_register_citation
          ? ` (${snapshot.federal_register_citation})`
          : ""
      }. ${section.veteranOverlay?.what_this_means ?? section.summary}`;

  return buildPageMetadata({
    title,
    description,
    canonicalPath: snapshot.permalink,
    ogType: "article",
    ogEyebrow: isQuarantined
      ? "Quarantined Notice · Not Enacted Law"
      : `38 C.F.R. Snapshot · Effective ${snapshot.effective_from}`,
    ogCite: snapshot.federal_register_citation ?? snapshot.cfr_section,
  });
}

export function buildDocumentMetadata(
  doc: CompiledDocument,
  sectionLabel: string,
): SeoMetadataResult {
  const primaryCites = [
    ...doc.cfrCitations.slice(0, 2),
    ...doc.diagnosticCodes.slice(0, 1).map((dc) => `DC ${dc}`),
    ...doc.statutes.slice(0, 1),
  ]
    .filter(Boolean)
    .join(" · ");

  const title = doc.veteranOverlay
    ? `${doc.veteranOverlay.plain_english_title} (${doc.cfrCitations[0] ?? sectionLabel})`
    : `${doc.title} | ${sectionLabel}`;

  const description = doc.veteranOverlay
    ? `${doc.veteranOverlay.what_this_means} Primary authorities: ${primaryCites || doc.title}.`
    : `${doc.title}. Inspect primary Title 38 and 38 C.F.R. authorities (${primaryCites || sectionLabel}), record clues, and procedural cautions.`;

  return buildPageMetadata({
    title,
    description,
    canonicalPath: doc.route,
    ogType: "article",
    ogEyebrow: sectionLabel,
    ogCite: primaryCites || undefined,
  });
}

export function buildVasrdSystemMetadata(
  sys: VasrdSystemCoverage,
): SeoMetadataResult {
  const title = `${sys.label} (${sys.diagnosticCodeRange}) — VASRD Rating Schedule`;
  const description = `Explore VA disability rating rules for ${sys.label} (${sys.diagnosticCodeRange}) under 38 C.F.R. Part 4: point-in-time regulatory snapshots, historical schedule changes, and record clues.`;

  return buildPageMetadata({
    title,
    description,
    canonicalPath: `/vasrd/${sys.systemId}`,
    ogType: "website",
    ogEyebrow: "38 C.F.R. Part 4 · VASRD Body-System Hub",
    ogCite: sys.diagnosticCodeRange,
  });
}
