import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreeColumnReader } from "@/components/bitemporal/three-column-reader";
import {
  getCompiledDocumentByRoute,
  getCoverageManifest,
  getDoctrineDocuments,
  getRelatedReaderDocuments,
} from "@/lib/corpus/loader";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getDoctrineDocuments().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/docs/${slug}`);
  if (!doc) return { title: "Doctrine Module Not Found" };
  return {
    title: doc.veteranOverlay
      ? `${doc.veteranOverlay.plain_english_title} | Doctrine`
      : `${doc.title} | Doctrine`,
  };
}

export default async function DoctrineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/docs/${slug}`);
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
      hubHref="/docs"
      hubLabel="Legal Doctrine Hub"
    />
  );
}
