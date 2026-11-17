import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreeColumnReader } from "@/components/bitemporal/three-column-reader";
import {
  getCompiledDocumentByRoute,
  getCoverageManifest,
  getPlaybookDocuments,
  getRelatedReaderDocuments,
} from "@/lib/corpus/loader";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getPlaybookDocuments().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/playbooks/${slug}`);
  if (!doc) return { title: "Playbook Not Found" };
  return {
    title: doc.veteranOverlay
      ? `${doc.veteranOverlay.plain_english_title} | Playbooks`
      : `${doc.title} | Playbooks`,
  };
}

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getCompiledDocumentByRoute(`/playbooks/${slug}`);
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
      hubHref="/playbooks"
      hubLabel="Playbooks & Guides"
    />
  );
}
