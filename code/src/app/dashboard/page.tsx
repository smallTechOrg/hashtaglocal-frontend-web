"use client";
import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";

interface Issue {
  id: number;
  user?: {
    username?: string;
    profile_photo?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
    colloquial_name?: string;
    locality?: {
      hashtags?: string[];
    };
  };
  type?: string;
  description?: string;
  created_at?: string;
  media_urls?: Array<{
    type?: string;
    url?: string;
  }>;
  vote_count?: number;
  verify_count?: number;
  status?: string;
  rank?: number;
}

interface IssuesResponse {
  data?: {
    issues?: Issue[];
  };
}

const ENDPOINT = process.env.NODE_ENV === "production"
  ? "https://staging.api.smalltech.in/local/api/v1/issues"
  : "/api/issues";

function formatDate(value?: string): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickMedia(issue: Issue): string | undefined {
  if (!issue.media_urls || issue.media_urls.length === 0) return undefined;
  const photo = issue.media_urls.find((item) => item.type === "photo" && item.url);
  return (photo || issue.media_urls[0]).url;
}

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(ENDPOINT, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload: IssuesResponse = await res.json();
        setIssues(payload.data?.issues || []);
        setStatus("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to load issues", err);
        setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const totals = useMemo(() => {
    const totalVotes = issues.reduce((sum, issue) => sum + (issue.vote_count || 0), 0);
    const totalVerifications = issues.reduce((sum, issue) => sum + (issue.verify_count || 0), 0);
    return { count: issues.length, totalVotes, totalVerifications };
  }, [issues]);

  return (
    <section className="issues-dashboard">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Live city feed</p>
          <h1 className="hero-title">#local dashboard</h1>
          <p className="hero-subtitle">
            Issues reported by the community, pulled straight from the staging API.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <p className="metric-label">Total issues</p>
            <p className="metric-value">{totals.count}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Votes</p>
            <p className="metric-value">{totals.totalVotes}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Verifications</p>
            <p className="metric-value">{totals.totalVerifications}</p>
          </div>
        </div>
      </div>

      {status === "loading" && (
        <div className="status-card">Loading the latest issues...</div>
      )}

      {status === "error" && (
        <div className="status-card status-error">
          We could not load issues from the API. Please try again in a moment.
        </div>
      )}

      {status === "ready" && issues.length === 0 && (
        <div className="status-card">No issues found.</div>
      )}

      {issues.length > 0 && (
        <div className="issues-grid">
          {issues.map((issue) => {
            const media = pickMedia(issue);
            const hashtags = issue.location?.locality?.hashtags || [];
            const locationLabel =
              issue.location?.colloquial_name || issue.location?.address || "Unknown location";
            return (
              <article className="issue-card" key={issue.id}>
                <div className="issue-media">
                  {media ? (
                    <img src={media} alt="Issue media" className="issue-media__img" />
                  ) : (
                    <div className="issue-media__placeholder">No image</div>
                  )}
                  <div className="pill-row">
                    {issue.type && <span className="pill pill-type">{issue.type}</span>}
                    {issue.status && <span className="pill pill-status">{issue.status}</span>}
                  </div>
                </div>

                <div className="issue-card__body">
                  <p className="issue-description">
                    {issue.description?.trim() || "No description provided."}
                  </p>

                  <div className="tags-and-location">
                    <div className="tag-row">
                      {hashtags.length > 0 ? (
                        hashtags.map((tag) => (
                          <span className="chip" key={tag}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="chip chip-muted">#untagged</span>
                      )}
                    </div>
                    <p className="location-text">{locationLabel}</p>
                  </div>
                </div>

                <footer className="issue-card__footer">
                  <div className="user-compact">
                    <div className="avatar avatar-small">
                      {issue.user?.profile_photo ? (
                        <img src={issue.user.profile_photo} alt={issue.user.username || "User"} />
                      ) : (
                        <div className="avatar-fallback">{(issue.user?.username || "?")[0]}</div>
                      )}
                    </div>
                    <div>
                      <p className="user-name small">{issue.user?.username || "Anonymous"}</p>
                      <p className="created-at">{formatDate(issue.created_at)}</p>
                    </div>
                  </div>
                  <div className="counters small">
                    <span>👍 {issue.vote_count ?? 0}</span>
                    <span>✅ {issue.verify_count ?? 0}</span>
                    <span>⭐ {issue.rank ?? 0}</span>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
