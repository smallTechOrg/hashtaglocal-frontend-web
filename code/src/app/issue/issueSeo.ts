import { API_PATHS } from "../constants/api";
import { Issue } from "../models/issue";
import { toIssueSlug } from "../../utils/issueSlug";

/**
 * Build-time helpers shared by the issue detail page (static params + per-issue metadata) and
 * the sitemap, so every URL the sitemap lists is a page that was actually exported (HTTP 200)
 * rather than a GitHub Pages 404.html fallback.
 */

export const SITE_URL = "https://local.smalltech.in";

/** All issues from the public API. Same URL + force-cache, so the build fetches it once. */
export async function fetchAllIssues(): Promise<Issue[]> {
  if (!API_PATHS.issues.startsWith("http")) return []; // no NEXT_PUBLIC_BASE_URL (local build)
  try {
    const res = await fetch(API_PATHS.issues, { cache: "force-cache" });
    if (!res.ok) return [];
    const payload = await res.json();
    return payload.data?.issues || payload.issues || [];
  } catch {
    return [];
  }
}

export function issueSlug(issue: Issue): string {
  return toIssueSlug(
    issue.id,
    issue.type,
    issue.location?.locality?.hashtags,
    issue.location?.colloquial_name || issue.location?.address,
  );
}

export function issueUrl(issue: Issue): string {
  return `${SITE_URL}/issue/${issueSlug(issue)}`;
}

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** "Koramangala" style place name: the colloquial name, else the first hashtag, else the address. */
export function issuePlace(issue: Issue): string | undefined {
  const loc = issue.location;
  const raw = loc?.colloquial_name || loc?.locality?.hashtags?.[0] || loc?.address;
  return raw?.replace(/^#/, "").trim() || undefined;
}

export function issueTitle(issue: Issue): string {
  const type = issue.type && issue.type !== "OTHER" ? titleCase(issue.type) : "Civic issue";
  const place = issuePlace(issue);
  return place ? `${type} in ${place}` : `${type} #${issue.id}`;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}

export function issueDescription(issue: Issue): string {
  const status = issue.status ? ` Status: ${titleCase(issue.status)}.` : "";
  const base = issue.description?.trim()
    ? issue.description
    : `${issueTitle(issue)} reported by the community.`;
  const suffix = `${status} Photos, updates and community votes on #local.`;
  return truncate(base, 160 - suffix.length) + suffix;
}

/** created_at as a Date (the API sends bare ISO strings meaning UTC); undefined if unparseable. */
export function issueCreatedAt(issue: Issue): Date | undefined {
  const raw = issue.created_at;
  if (!raw) return undefined;
  const date = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(raw) ? raw : raw + "Z");
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** First absolute photo URL of the issue, for og:image. */
export function issueImage(issue: Issue): string | undefined {
  const media = issue.media_urls?.find((m) => m.url?.startsWith("http"));
  return media?.url;
}
