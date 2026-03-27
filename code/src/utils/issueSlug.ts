function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a URL slug for an issue.
 * Format: "{id}-{type}-{hashtag}"
 * e.g. "1020-pothole-koramangala"
 * Falls back to address/colloquial name if no hashtag is available.
 */
export function toIssueSlug(
  id: number | string,
  type?: string,
  hashtags?: string[],
  fallbackLocation?: string
): string {
  const parts: string[] = [String(id)];
  if (type) parts.push(slugify(type));
  const location = hashtags?.[0] || fallbackLocation;
  if (location) parts.push(slugify(location));
  return parts.filter(Boolean).join('-');
}

/**
 * Extracts the numeric ID from an issue slug.
 * e.g. "1020-pothole-koramangala" → "1020"
 */
export function extractIssueId(slug: string): string {
  return slug.split('-')[0];
}
