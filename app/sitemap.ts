import type { MetadataRoute } from "next";
import { getCoverageManifest } from "@/lib/corpus/loader";
import { listAllCanonicalPaths } from "@/lib/seo/crawl-audit";
import { SITE_URL } from "@/lib/seo/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const manifest = getCoverageManifest();
  const paths = listAllCanonicalPaths();

  return paths.map((path) => {
    const isRoot = path === "/";
    const isPrimaryHub =
      path === "/explore" ||
      path === "/vasrd" ||
      path === "/cfr" ||
      path === "/playbooks" ||
      path === "/cases" ||
      path === "/timeline" ||
      path === "/crosswalk" ||
      path.startsWith("/vasrd/");

    return {
      url: isRoot ? SITE_URL : `${SITE_URL}${path}`,
      lastModified: manifest.checkedAsOf,
      changeFrequency: isRoot || isPrimaryHub ? "weekly" : "monthly",
      priority: isRoot ? 1.0 : isPrimaryHub ? 0.9 : path === "/privacy" ? 0.5 : 0.8,
    };
  });
}
