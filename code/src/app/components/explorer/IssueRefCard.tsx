"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, MapPin, ThumbsUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { API_PATHS } from "../../constants/api";
import type { Issue } from "../../models/issue";
import { formatTimeAgo, prettyType } from "./layerConfig";

/** Status → chip styling. */
const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "is-open" },
  RESOLVED: { label: "Resolved", cls: "is-resolved" },
  ONHOLD: { label: "On hold", cls: "is-hold" },
  REJECTED: { label: "Rejected", cls: "is-rejected" },
};

// Tiny in-memory cache so the same issue isn't re-fetched per render across the stream.
const issueCache = new Map<number, Issue>();

/**
 * Detailed card for an ISSUE_REF chat message. Lazily fetches the issue by id and renders a rich
 * preview (photo, type + status, description, location, vote/verify counts, time) linking to the
 * full issue page. Falls back to a compact line while loading or if the fetch fails.
 */
export default function IssueRefCard({ issueId, fallbackText }: { issueId?: number; fallbackText?: string }) {
  const [issue, setIssue] = useState<Issue | null>(
    issueId != null ? issueCache.get(issueId) ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (issueId == null || issueCache.has(issueId)) return;
    const controller = new AbortController();
    fetch(API_PATHS.issue(issueId), { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body) => {
        const loaded: Issue | undefined = body?.data?.issue ?? body?.issue;
        if (loaded) {
          issueCache.set(issueId, loaded);
          setIssue(loaded);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => controller.abort();
  }, [issueId]);

  // Loading / failed → compact fallback line.
  if (!issue) {
    return (
      <span className="xp-msg-body">
        <span className="xp-issuecard xp-issuecard--mini">
          <AlertTriangle className="xp-issuecard-mini-icon" />
          {fallbackText ?? (failed ? "Issue reported nearby" : "Loading issue…")}
        </span>
      </span>
    );
  }

  const status = STATUS_STYLE[(issue.status ?? "").toUpperCase()] ?? {
    label: issue.status ?? "",
    cls: "is-open",
  };
  const thumb = issue.media_urls?.find((m) => m.url_thumbnail || m.url);
  const place =
    issue.location?.colloquial_name ||
    issue.location?.address ||
    issue.location?.locality?.hashtags?.[0];

  return (
    <span className="xp-msg-body">
      <Link href={`/issue/${issue.id}`} className="xp-issuecard">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.url_thumbnail || thumb.url}
            alt=""
            className="xp-issuecard-img"
          />
        )}
        <span className="xp-issuecard-body">
          <span className="xp-issuecard-top">
            <span className="xp-issuecard-type">
              <AlertTriangle className="xp-issuecard-type-icon" />
              {prettyType(issue.type)}
            </span>
            <span className={`xp-issuecard-status ${status.cls}`}>{status.label}</span>
          </span>

          {issue.description && (
            <span className="xp-issuecard-desc">{issue.description}</span>
          )}

          <span className="xp-issuecard-meta">
            {place && (
              <span className="xp-issuecard-place">
                <MapPin className="xp-issuecard-meta-icon" />
                {place}
              </span>
            )}
            {typeof issue.vote_count === "number" && issue.vote_count > 0 && (
              <span className="xp-issuecard-stat">
                <ThumbsUp className="xp-issuecard-meta-icon" />
                {issue.vote_count}
              </span>
            )}
            {typeof issue.verify_count === "number" && issue.verify_count > 0 && (
              <span className="xp-issuecard-stat">
                <CheckCircle2 className="xp-issuecard-meta-icon" />
                {issue.verify_count}
              </span>
            )}
            <span className="xp-issuecard-time">{formatTimeAgo(issue.created_at)}</span>
          </span>

          <span className="xp-issuecard-cta">
            View issue <ArrowUpRight className="xp-issuecard-meta-icon" />
          </span>
        </span>
      </Link>
    </span>
  );
}
