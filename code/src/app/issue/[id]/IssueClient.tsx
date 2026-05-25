"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import "../issue.css";
import { Issue } from "../../models/issue";
import ImageSlideshow from "../../components/ImageSlideshow";
import EditIssueModal from "../../components/dashboard/editIssueModal";
import { buildGoogleAuthUrl } from "../../ops/lib/auth";
import { GOOGLE_CLIENT_ID } from "../../ops/lib/constants";
import { setReportLocation } from "../../components/report-issue/reportStore";
import { reverseGeocode } from "../../utils/geocoding";
import { useScrollTracking, useTimeTracking } from "../../hooks/useScrollTracking";
import { useClickTracking } from "../../hooks/useClickTracking";
import { trackIssueView, trackError, trackExternalLink, EventCategory } from "../../utils/analytics";
import { useAnalytics } from "../../context/AnalyticsContext";
import { BASE_URL } from "../../constants/api";
import { extractIssueId } from "../../../utils/issueSlug";
import { getAccessToken } from "../../ops/lib/auth";

interface IssueResponse {
  data?: {
    issue?: Issue;
  };
  issue?: Issue;
}

const API_BASE = process.env.NODE_ENV === "production"
  ? `${BASE_URL}/api/v1`
  : "/api";

function allMediaImages(issue?: Issue): Array<{ url: string; thumbnail?: string; description?: string }> {
  if (!issue?.media_urls || issue.media_urls.length === 0) return [];
  return issue.media_urls
    .filter((m) => m.url)
    .map((m) => ({ url: m.url!, thumbnail: m.url_thumbnail, description: m.description }));
}

// API returns bare ISO strings without timezone (e.g. "2026-05-13T06:20:00").
// Without a suffix the browser treats them as local time; append Z so they're
// always parsed as UTC and converted to the user's local timezone.
function parseDate(dateString: string): Date {
  if (/[Z+\-]\d*$/.test(dateString)) return new Date(dateString);
  return new Date(dateString + "Z");
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Unknown date";
  const date = parseDate(dateString);
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

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  return parseDate(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(from?: string, to?: string): number | null {
  if (!from) return null;
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  POTHOLE:   { emoji: "🕳️", color: "#bb3e03" },
  WASTE:     { emoji: "🗑️", color: "#ca6702" },
  FOOTPATH:  { emoji: "🚶", color: "#005f73" },
  POLLUTION: { emoji: "🌫️", color: "#0a9396" },
  HYGIENE:   { emoji: "🧼", color: "#256d1b" },
  SAFETY:    { emoji: "🛡️", color: "#ae2012" },
  OTHER:     { emoji: "📌", color: "#5b3000" },
};

export default function IssueClient({ issueId: propIssueId }: { issueId: string }) {
  const [issueId, setIssueId] = useState<string>(propIssueId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNewReport = searchParams.get("new") === "1";
  const [showNewBanner, setShowNewBanner] = useState(isNewReport);

  // Silently remove ?new=1 from the URL so refresh doesn't re-show the banner
  useEffect(() => {
    if (isNewReport) {
      const url = window.location.pathname;
      router.replace(url, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (propIssueId && propIssueId !== 'index') {
      setIssueId(propIssueId);
      return;
    }
    const path = window.location.pathname;
    const match = path.match(/\/issue\/([^/?]+)/);
    if (match && match[1] !== 'index') {
      setIssueId(match[1]);
    } else {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('id');
      if (queryId) setIssueId(queryId);
    }
  }, [propIssueId]);
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useScrollTracking();
  useTimeTracking(`/issue/${issueId}`);
  const trackClick = useClickTracking();
  const { trackJourneyStep } = useAnalytics();

  useEffect(() => {
    const hasEditAccess = localStorage.getItem('dev_edit_access') === 'true';
    setCanEdit(hasEditAccess);
  }, []);

  // After OAuth redirect with ?update=1 — wait for issue to load, then navigate to camera
  useEffect(() => {
    if (searchParams.get("update") === "1") {
      sessionStorage.removeItem("report_issue_pending");
      router.replace(window.location.pathname, { scroll: false });
      setPendingUpdate(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to camera once issue is loaded (post-OAuth update flow)
  useEffect(() => {
    if (pendingUpdate && issue) {
      setPendingUpdate(false);
      const numericId = extractIssueId(issueId);
      router.push(`/update/${numericId}/camera?type=${encodeURIComponent(issue.type ?? "")}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUpdate, issue]);

  const fetchIssue = useCallback(async (signal?: AbortSignal) => {
    if (!issueId) return;
    setStatus("loading");
    try {
      const numericId = extractIssueId(issueId);
      const token = getAccessToken();
      const fetchHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/issue/${numericId}`, { signal, cache: "no-store", headers: fetchHeaders });
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

  async function handleUpdateOpen() {
    if (!issue) return;
    setUpdateError(null);

    const token = getAccessToken();
    if (!token) {
      sessionStorage.setItem("report_issue_return_to", `${window.location.pathname}?update=1`);
      const redirectUri = `${window.location.origin}/auth/callback`;
      window.location.href = buildGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
      return;
    }

    setUpdateChecking(true);

    // Camera permission (required)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setUpdateError("Camera access was denied. Camera permission is required to update an issue.");
      setUpdateChecking(false);
      return;
    }

    // Location (optional for update)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );
      setReportLocation(pos, null);
      reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((meta) => {
        if (meta) setReportLocation(pos, meta);
      });
    } catch {
      // Location is optional for updates — proceed without it
    }

    setUpdateChecking(false);
    const numericId = extractIssueId(issueId);
    router.push(`/update/${numericId}/camera?type=${encodeURIComponent(issue.type ?? "")}`);
  }

  // Banner stays visible for the entire session — user closes it themselves (no auto-hide)

  const mediaImages = useMemo(() => allMediaImages(issue || undefined), [issue]);
  const hashtags = issue?.location?.locality?.hashtags || [];
  const locationLabel = issue?.location?.colloquial_name || issue?.location?.address || "Unknown location";
  const isResolved = issue?.status === "RESOLVED";
  const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
    OPEN:     { label: "🔴 Open",          className: "story-badge-open" },
    ONHOLD:   { label: "⏳ ONHOLD",        className: "story-badge-onhold" },
    RESOLVED: { label: "✅ Resolved",      className: "story-badge-resolved" },
    REJECTED: { label: "❌ Rejected",      className: "story-badge-rejected" },
  };
  const statusDisplay = STATUS_DISPLAY[(issue?.status || "").toUpperCase()] ?? { label: issue?.status || "Unknown", className: "story-badge-open" };
  const typeMeta = TYPE_META[(issue?.type || "OTHER").toUpperCase()] || TYPE_META.OTHER;
  const portal = issue?.gov_portal_data?.[0];
  const daysActive = daysBetween(issue?.created_at);

  return (
    <main className="story-page">
      {showNewBanner && (
        <div className="story-new-banner">
          🎉 Your issue has been submitted! It is under review. Once approved by our team, it will be visible to everyone.
          <button className="story-new-banner-close" onClick={() => setShowNewBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {/* Top nav */}
      <nav className="story-nav">
        <Link className="story-back" href="/" onClick={() => trackClick('Back to Home', EventCategory.NAVIGATION)}>
          ← Back
        </Link>
        {canEdit && issue && (
          <button
            className="story-edit-btn"
            type="button"
            onClick={() => {
              trackClick(`Edit Issue ${issueId}`, EventCategory.ISSUE, { issue_id: issueId });
              setEditingIssue(issue);
            }}
          >
            Edit
          </button>
        )}
      </nav>

      {status === "loading" && (
        <div className="story-loading">
          <div className="story-loading-shimmer" />
          <div className="story-loading-shimmer story-loading-short" />
        </div>
      )}

      {status === "error" && (
        <div className="story-error">
          <p>😔 We could not load this issue. Please try again.</p>
        </div>
      )}

      {status === "ready" && issue && (
        <>
          {/* Hero Image */}
          <div className="story-hero">
            {mediaImages.length > 0 ? (
              <ImageSlideshow
                images={mediaImages}
                alt={issue.description?.slice(0, 60) || "Issue photo"}
                imageClassName="story-hero-img"
                autoPlayMs={5000}
                onSlideChange={setActiveSlide}
              />
            ) : (
              <div className="story-hero-placeholder">
                <span className="story-hero-emoji">{typeMeta.emoji}</span>
              </div>
            )}
            <div className="story-hero-overlay">
              <span className="story-badge" style={{ backgroundColor: typeMeta.color }}>
                {typeMeta.emoji} {issue.type}
              </span>
              <span className={`story-badge ${statusDisplay.className}`}>
                {statusDisplay.label}
              </span>
            </div>
          </div>

          {/* Story Body */}
          <div className="story-body">
            {/* Header */}
            <div className="story-header-card">
              <h1 className="story-title">{locationLabel}</h1>
              {issue.location?.address && issue.location.address !== locationLabel && (
                <p className="story-subtitle">{issue.location.address}</p>
              )}
              <p
                key={mediaImages.length > 1 ? activeSlide : undefined}
                className="story-description"
              >
                {(mediaImages.length > 1 && mediaImages[activeSlide]?.description) || issue.description || "No description provided."}
              </p>
              <div className="story-meta-row">
                {issue.user?.username && (
                  <span className="story-meta-item">👤 {issue.user.username.split("@")[0]}</span>
                )}
                <span className="story-meta-item">📅 {formatDate(issue.created_at)}</span>
                <span className="story-meta-item">⏱️ {formatTimeAgo(issue.created_at)}</span>
              </div>
              {hashtags.length > 0 && (
                <div className="story-tags">
                  {hashtags.map(tag => (
                    <span key={tag} className="story-tag">#{tag.startsWith('#') ? tag.slice(1) : tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats strip */}
            <div className="story-stats">
              <div className="story-stat">
                <span className="story-stat-value">{daysActive || "—"}</span>
                <span className="story-stat-label">{isResolved ? "days to resolve" : "days active"}</span>
              </div>
              {(issue.verify_count || 0) > 0 && (
                <div className="story-stat">
                  <span className="story-stat-value">{issue.verify_count}</span>
                  <span className="story-stat-label">verification{(issue.verify_count || 0) > 1 ? "s" : ""}</span>
                </div>
              )}
              {(issue.vote_count || 0) > 0 && (
                <div className="story-stat">
                  <span className="story-stat-value">{issue.vote_count}</span>
                  <span className="story-stat-label">vote{(issue.vote_count || 0) > 1 ? "s" : ""}</span>
                </div>
              )}
              {mediaImages.length > 0 && (
                <div className="story-stat">
                  <span className="story-stat-value">{mediaImages.length}</span>
                  <span className="story-stat-label">photo{mediaImages.length > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Update Issue */}
            <button
              className="story-update-btn"
              onClick={handleUpdateOpen}
              disabled={updateChecking}
            >
              <span className="story-update-btn-icon">📸</span>
              <span className="story-update-btn-text">
                <span className="story-update-btn-label">
                  {updateChecking ? "Checking…" : "Update this Issue"}
                </span>
                <span className="story-update-btn-sub">Add a photo to verify or mark as resolved</span>
              </span>
              <span className="story-update-btn-arrow">→</span>
            </button>
            {updateError && (
              <p className="story-update-error">{updateError}</p>
            )}

            {/* Timeline */}
            <div className="story-section">
              <h2 className="story-section-title">📖 Issue Journey</h2>
              <div className="story-timeline">
                {/* Reported */}
                <div className="story-tl-item story-tl-done">
                  <div className="story-tl-icon">📢</div>
                  <div className="story-tl-line" />
                  <div className="story-tl-body">
                    <p className="story-tl-title">Reported</p>
                    <p className="story-tl-date">{formatDate(issue.created_at)}</p>
                    {issue.user?.username && (
                      <p className="story-tl-detail">Reported by {issue.user.username.split("@")[0]}</p>
                    )}
                    {issue.description && (
                      <p className="story-tl-quote">&ldquo;{issue.description}&rdquo;</p>
                    )}
                  </div>
                </div>

                {/* Verified */}
                <div className={`story-tl-item ${(issue.verify_count || 0) > 0 ? "story-tl-done" : "story-tl-pending"}`}>
                  <div className="story-tl-icon">✅</div>
                  <div className="story-tl-line" />
                  <div className="story-tl-body">
                    <p className="story-tl-title">Community Verification</p>
                    {(issue.verify_count || 0) > 0 ? (
                      <p className="story-tl-detail">
                        {issue.verify_count} resident{(issue.verify_count || 0) > 1 ? "s" : ""} confirmed this issue exists
                      </p>
                    ) : (
                      <p className="story-tl-detail story-tl-pending-text">Awaiting community verification</p>
                    )}
                  </div>
                </div>

                {/* Gov Portal */}
                <div className={`story-tl-item ${portal ? "story-tl-done" : "story-tl-pending"}`}>
                  <div className="story-tl-icon">🏛️</div>
                  <div className="story-tl-line" />
                  <div className="story-tl-body">
                    <p className="story-tl-title">Government Portal</p>
                    {portal ? (
                      <div className="story-portal-card">
                        <div className="story-portal-header">
                          <span className="story-portal-name">{portal.portal_name || "Government Portal"}</span>
                          <span className={`story-portal-status ${
                            portal.status?.toLowerCase().includes("closed") || portal.status?.toLowerCase().includes("resolved")
                              ? "story-portal-status-closed"
                              : "story-portal-status-open"
                          }`}>
                            {portal.status || "Submitted"}
                          </span>
                        </div>
                        <div className="story-portal-grid">
                          {portal.tracking_id && (
                            <div className="story-portal-field">
                              <span className="story-portal-label">Tracking ID</span>
                              <span className="story-portal-value">{portal.tracking_id}</span>
                            </div>
                          )}
                          {portal.created_at && (
                            <div className="story-portal-field">
                              <span className="story-portal-label">Submitted</span>
                              <span className="story-portal-value">{formatDate(portal.created_at)}</span>
                            </div>
                          )}
                          {portal.updated_at && (
                            <div className="story-portal-field">
                              <span className="story-portal-label">Last Updated</span>
                              <span className="story-portal-value">{formatDate(portal.updated_at)}</span>
                            </div>
                          )}
                          {portal.created_at && portal.updated_at && (
                            <div className="story-portal-field">
                              <span className="story-portal-label">Response Time</span>
                              <span className="story-portal-value">{daysBetween(portal.created_at, portal.updated_at)} days</span>
                            </div>
                          )}
                        </div>
                        {portal.meta_data && Object.keys(portal.meta_data).length > 0 && (
                          <div className="story-portal-meta">
                            <p className="story-portal-meta-title">Government Response Details</p>
                            <div className="story-portal-meta-grid">
                              {Object.entries(portal.meta_data).map(([key, value]) => (
                                <div key={key} className="story-portal-meta-item">
                                  <span className="story-portal-label">{key.replace(/_/g, " ")}</span>
                                  <span className="story-portal-value">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {portal.portal_track_link && (
                          <a
                            href={portal.portal_track_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="story-portal-link"
                            onClick={() => trackExternalLink(portal.portal_track_link!, `Track on ${portal.portal_name}`)}
                          >
                            Track on {portal.portal_name || "portal"} ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="story-tl-detail story-tl-pending-text">Not yet submitted to government portal</p>
                    )}
                  </div>
                </div>

                {/* Resolved */}
                <div className={`story-tl-item ${isResolved ? "story-tl-done story-tl-final" : "story-tl-pending"}`}>
                  <div className="story-tl-icon">{isResolved ? "🎉" : "⏳"}</div>
                  <div className="story-tl-body">
                    <p className="story-tl-title">{isResolved ? "Resolved!" : "Resolution Pending"}</p>
                    {isResolved ? (
                      <p className="story-tl-detail">This issue has been resolved. Thank you to everyone who helped!</p>
                    ) : (
                      <p className="story-tl-detail story-tl-pending-text">This issue is still being worked on</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Details */}
            <div className="story-section">
              <h2 className="story-section-title">📍 Location Details</h2>
              <div className="story-detail-grid">
                <div className="story-detail-card">
                  <span className="story-detail-label">Area</span>
                  <span className="story-detail-value">{locationLabel}</span>
                </div>
                {issue.location?.address && issue.location.address !== locationLabel && (
                  <div className="story-detail-card">
                    <span className="story-detail-label">Full Address</span>
                    <span className="story-detail-value">{issue.location.address}</span>
                  </div>
                )}
                {issue.location?.lat && issue.location?.lng && (
                  <div className="story-detail-card">
                    <span className="story-detail-label">Coordinates</span>
                    <span className="story-detail-value">
                      {issue.location.lat.toFixed(6)}, {issue.location.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                <div className="story-detail-card">
                  <span className="story-detail-label">Issue Type</span>
                  <span className="story-detail-value" style={{ color: typeMeta.color }}>
                    {typeMeta.emoji} {issue.type}
                  </span>
                </div>
                <div className="story-detail-card">
                  <span className="story-detail-label">Status</span>
                  <span className="story-detail-value">{issue.status}</span>
                </div>
              </div>
            </div>

            {/* Media gallery for multiple photos */}
            {mediaImages.length > 1 && (
              <div className="story-section">
                <h2 className="story-section-title">📷 Evidence ({mediaImages.length} photos)</h2>
                <div className="story-gallery">
                  {issue.media_urls?.filter(m => m.url).map((m, idx) => (
                    <div key={idx} className="story-gallery-item">
                      <img src={m.url_thumbnail || m.url} alt={`Evidence ${idx + 1}`} className="story-gallery-img" loading="lazy" />
                      {m.username && <p className="story-gallery-caption">📸 {m.username.split("@")[0]}</p>}
                      {m.created_at && <p className="story-gallery-date">{formatDate(m.created_at)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
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
