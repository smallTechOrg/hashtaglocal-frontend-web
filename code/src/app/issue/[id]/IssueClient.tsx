"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../issue.css";
import { Issue } from "../../models/issue";
import ImageSlideshow from "../../components/ImageSlideshow";
import EditIssueModal from "../../components/dashboard/editIssueModal";
import { useScrollTracking, useTimeTracking } from "../../hooks/useScrollTracking";
import { useClickTracking } from "../../hooks/useClickTracking";
import { trackIssueView, trackIssueShare, trackError, trackExternalLink, EventCategory } from "../../utils/analytics";
import { useAnalytics } from "../../context/AnalyticsContext";
import { BASE_URL } from "../../constants/api";

interface IssueResponse {
  data?: {
    issue?: Issue;
  };
  issue?: Issue;
}

const API_BASE = process.env.NODE_ENV === "production"
  ? `${BASE_URL}/api/v1`
  : "/api";

function allMediaImages(issue?: Issue): Array<{ url: string; thumbnail?: string }> {
  if (!issue?.media_urls || issue.media_urls.length === 0) return [];
  return issue.media_urls
    .filter((m) => m.url)
    .map((m) => ({ url: m.url!, thumbnail: m.url_thumbnail }));
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

export default function IssueClient({ issueId: propIssueId }: { issueId: string }) {
  // For static hosting: extract ID from URL path if not in props
  const [issueId, setIssueId] = useState<string>(propIssueId);
  
  useEffect(() => {
    // If we have a prop ID that's not 'index', use it
    if (propIssueId && propIssueId !== 'index') {
      setIssueId(propIssueId);
      return;
    }
    
    // Otherwise, try to extract from URL path (for static hosting)
    const path = window.location.pathname;
    const match = path.match(/\/issue\/([^/?]+)/);
    if (match && match[1] !== 'index') {
      setIssueId(match[1]);
    } else {
      // Fallback to query param
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('id');
      if (queryId) setIssueId(queryId);
    }
  }, [propIssueId]);
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Analytics hooks
  useScrollTracking();
  useTimeTracking(`/issue/${issueId}`);
  const trackClick = useClickTracking();
  const { trackJourneyStep } = useAnalytics();

  useEffect(() => {
    // Check localStorage for edit access
    const hasEditAccess = localStorage.getItem('dev_edit_access') === 'true';
    setCanEdit(hasEditAccess);
  }, []);

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
      trackIssueView(issueId, loaded.type);
      trackJourneyStep('issue_viewed', { issue_id: String(issueId), issue_type: loaded.type, issue_status: loaded.status });
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to load issue", err);
      trackError('api_load_error', String(err), `issue_${issueId}`);
      setStatus("error");
    }
  }, [issueId, trackJourneyStep]);

  useEffect(() => {
    if (!issueId) return;
    const controller = new AbortController();
    fetchIssue(controller.signal);
    return () => controller.abort();
  }, [fetchIssue, issueId]);

  const mediaImages = useMemo(() => allMediaImages(issue || undefined), [issue]);
  const hashtags = issue?.location?.locality?.hashtags || [];
  const locationLabel = issue?.location?.colloquial_name || issue?.location?.address || "Unknown location";
  const hasCoords = issue?.location?.lat != null && issue?.location?.lng != null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      trackIssueShare(issueId, 'copy_link');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      trackError('clipboard_error', String(err), 'copy_issue_link');
    }
  };

  return (
    <main className="issue-page">
      <div className="issue-hero">
        <div>
          <Link className="back-link" href="/" onClick={() => trackClick('Back to Home', EventCategory.NAVIGATION)}>
            ← Home
          </Link>
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
              <a 
                className="primary-btn" 
                href={`https://maps.google.com/?q=${issue.location?.lat},${issue.location?.lng}`} 
                target="_blank" 
                rel="noreferrer"
                onClick={() => {
                  trackExternalLink(`https://maps.google.com/?q=${issue.location?.lat},${issue.location?.lng}`, 'Open in Google Maps');
                  trackClick('Open in Maps', EventCategory.USER_INTERACTION, { issue_id: issueId });
                }}
              >
                Open in Maps
              </a>
            )}
            <button className="primary-btn" type="button" onClick={copyLink}>
              {copied ? "Copied!" : "Copy Link"}
            </button>
            {canEdit && (
              <button 
                className="primary-btn" 
                type="button" 
                onClick={() => {
                  trackClick(`Edit Issue ${issueId}`, EventCategory.ISSUE, { issue_id: issueId });
                  setEditingIssue(issue);
                }}
              >
                Edit
              </button>
            )}
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
          {mediaImages.length > 0 && (
            <ImageSlideshow
              images={mediaImages}
              alt="Issue media"
              imageClassName="issue-image"
              onClick={() => trackClick('Issue Image View', EventCategory.ENGAGEMENT, { issue_id: issueId })}
              style={{ cursor: 'pointer' }}
            />
          )}
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
              <p className="meta-label">📍 Coordinates</p>
              <p className="meta-value">
                {issue.location?.lat && issue.location?.lng 
                  ? `${issue.location.lat.toFixed(6)}, ${issue.location.lng.toFixed(6)}` 
                  : "N/A"}
              </p>
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
