import { MetadataRoute } from "next";
import { API_PATHS } from "./constants/api";
import { toIssueSlug } from "../utils/issueSlug";
import { Issue } from "./models/issue";

export const dynamic = "force-static";

const baseUrl = "https://local.smalltech.in";

async function fetchAllIssues(): Promise<Issue[]> {
  try {
    const res = await fetch(API_PATHS.issues, { cache: "force-cache" });
    if (!res.ok) return [];
    const payload = await res.json();
    return payload.data?.issues || payload.issues || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const issues = await fetchAllIssues();

  const issueEntries: MetadataRoute.Sitemap = issues.map((issue) => ({
    url: `${baseUrl}/issue/${toIssueSlug(issue.id, issue.type, issue.location?.locality?.hashtags, issue.location?.colloquial_name || issue.location?.address)}`,
    lastModified: issue.created_at ? new Date(issue.created_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...issueEntries,
  ];
}
