import { MetadataRoute } from "next";
import { SITE_URL, fetchAllIssues, issueCreatedAt, issueUrl } from "./issue/issueSeo";

export const dynamic = "force-static";

// Only URLs that are exported as real pages (HTTP 200) and are canonical to themselves.
// Issue URLs come from the same list as issue/[id] generateStaticParams, so they always exist.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const issues = await fetchAllIssues();
  const buildTime = new Date();

  const issueEntries: MetadataRoute.Sitemap = issues.map((issue) => ({
    url: issueUrl(issue),
    lastModified: issueCreatedAt(issue) ?? buildTime,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: buildTime, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/feed`, lastModified: buildTime, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/join`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date("2026-04-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, lastModified: new Date("2026-04-01"), changeFrequency: "yearly", priority: 0.2 },
    ...issueEntries,
  ];
}
