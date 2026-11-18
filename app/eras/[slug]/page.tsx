import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreeColumnReader } from "@/components/bitemporal/three-column-reader";
import {
  getCompiledDocumentByRoute,
  getCoverageManifest,
  getEraDocuments,
  getRelatedReaderDocuments,
} from "@/lib/corpus/loader";
import { buildDocumentMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getEraDocuments().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/eras/${slug}`);
  if (!doc) return { title: "Era Lens Not Found" };
  return buildDocumentMetadata(doc, "Historical Era Lens");
}

export default async function EraLensDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/eras/${slug}`);
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
      hubHref="/eras"
      hubLabel="Historical Era Lenses"
    />
  );
}
