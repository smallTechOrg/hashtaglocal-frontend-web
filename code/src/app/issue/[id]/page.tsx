"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import "../issue.css";
import { Issue } from "../../models/issue";
import EditIssueModal from "../../components/dashboard/editIssueModal";

interface IssueResponse {
  data?: {
    issue?: Issue;
  };
  issue?: Issue;
}

const API_BASE = process.env.NODE_ENV === "production"
  ? "https://staging.api.smalltech.in/local/api/v1"
  : "/api";

function pickMedia(issue?: Issue): string | undefined {
  if (!issue?.media_urls || issue.media_urls.length === 0) return undefined;
  const photo = issue.media_urls.find((item) => item.type === "photo" && item.url);
  return (photo || issue.media_urls[0]).url;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);
  if (diffInSeconds < 60) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  if (diffInDays < 30) return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
  return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
}

export default function IssueDetailPage() {
  const params = useParams();
  const issueId = params?.id as string | undefined;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  const fetchIssue = useCallback(async (signal?: AbortSignal) => {
    if (!issueId) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/issue/${issueId}`, { signal, cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const payload: IssueResponse = await res.json();
      const loaded = payload.data?.issue || payload.issue || (payload as unknown as Issue);
      if (!loaded) throw new Error("Issue not found in response");
      setIssue(loaded);
      setStatus("ready");
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to load issue", err);
      setStatus("error");
    }
  }, [issueId]);

  useEffect(() => {
    if (!issueId) return;
    const controller = new AbortController();
    fetchIssue(controller.signal);
    return () => controller.abort();
  }, [fetchIssue, issueId]);

  const mediaUrl = useMemo(() => pickMedia(issue || undefined), [issue]);
  const hashtags = issue?.location?.locality?.hashtags || [];
  const locationLabel = issue?.location?.colloquial_name || issue?.location?.address || "Unknown location";
  const hasCoords = issue?.location?.lat != null && issue?.location?.lng != null;

  return (
    <main className="issue-page">
      <div className="issue-hero">
        <div>
          <Link className="back-link" href="/dashboard">← Back to dashboard</Link>
          <h1>Issue #{issueId}</h1>
          {issue && (
            <div className="issue-meta">
              {issue.type && <span className="issue-pill pill-type">{issue.type}</span>}
              {issue.status && <span className="issue-pill pill-status">{issue.status}</span>}
              <span className="time-meta">Reported {formatTimeAgo(issue.created_at)}</span>
            </div>
          )}
        </div>
        {issue && (
          <div className="actions-row">
            {hasCoords && (
              <a className="primary-btn" href={`https://maps.google.com/?q=${issue.location?.lat},${issue.location?.lng}`} target="_blank" rel="noreferrer">
                Open in Maps
              </a>
            )}
            <Link className="primary-btn" href={`/issue/${issue.id}`}>Permalink</Link>
            <button className="primary-btn" type="button" onClick={() => setEditingIssue(issue)}>
              Edit
            </button>
          </div>
        )}
      </div>

      {status === "loading" && <div className="status-card">Loading issue…</div>}
      {status === "error" && (
        <div className="status-card status-error">
          We could not load this issue. Please try again.
        </div>
      )}

      {status === "ready" && issue && (
        <section className="issue-card">
          {mediaUrl && <img src={mediaUrl} alt="Issue media" className="issue-image" />}
          <p className="issue-description">{issue.description || "No description provided."}</p>

          <div className="issue-section">
            <p className="section-title">Location</p>
            <p className="meta-value">{locationLabel}</p>
          </div>

          <div className="issue-section">
            <p className="section-title">Tags</p>
            <div className="chip-row">
              {hashtags.length > 0 ? hashtags.map((tag) => (
                <span key={tag} className="chip">#{tag}</span>
              )) : (
                <span className="chip">#untagged</span>
              )}
            </div>
          </div>

          <div className="metadata-grid">
            <div className="meta-box">
              <p className="meta-label">Status</p>
              <p className="meta-value">{issue.status || "Unknown"}</p>
            </div>
            <div className="meta-box">
              <p className="meta-label">Type</p>
              <p className="meta-value">{issue.type || "Unknown"}</p>
            </div>
            <div className="meta-box">
              <p className="meta-label">Votes</p>
              <p className="meta-value">{issue.vote_count ?? 0}</p>
            </div>
            <div className="meta-box">
              <p className="meta-label">Verifications</p>
              <p className="meta-value">{issue.verify_count ?? 0}</p>
            </div>
          </div>
        </section>
      )}

      {editingIssue && (
        <EditIssueModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onUpdate={() => fetchIssue()}
        />
      )}
    </main>
  );
}
