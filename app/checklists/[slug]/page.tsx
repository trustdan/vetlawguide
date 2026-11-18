import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreeColumnReader } from "@/components/bitemporal/three-column-reader";
import {
  getChecklistDocuments,
  getCompiledDocumentByRoute,
  getCoverageManifest,
  getRelatedReaderDocuments,
} from "@/lib/corpus/loader";
import { buildDocumentMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getChecklistDocuments().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/checklists/${slug}`);
  if (!doc) return { title: "Checklist Not Found" };
  return buildDocumentMetadata(doc, "Pre-Filing Checklists");
}

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/checklists/${slug}`);
  if (!doc) notFound();

  const manifest = getCoverageManifest();
  const relatedDocs = getRelatedReaderDocuments(doc, 6);

  return (
    <ThreeColumnReader
      doc={doc}
      checkedAsOf={manifest.checkedAsOf}
      corpusReleaseId={manifest.corpusReleaseId}
      activeBookmarkWave={manifest.activeBookmarkWave}
      relatedDocs={relatedDocs}
      hubHref="/checklists"
      hubLabel="Pre-Filing Checklists"
    />
  );
}
