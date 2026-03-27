"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import { Issue } from "../models/issue";
import ImageSlideshow from "../components/ImageSlideshow";
import EditIssueModal from "../components/dashboard/editIssueModal";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";
import { useClickTracking } from "../hooks/useClickTracking";
import { trackIssueFilter, trackError, EventCategory } from "../utils/analytics";
import { toIssueSlug } from "../../utils/issueSlug";
import { useAnalytics } from "../context/AnalyticsContext";
import { API_PATHS } from "../constants/api";

interface IssuesResponse {
  data?: {
    issues?: Issue[];
  };
}

const ENDPOINT = process.env.NODE_ENV === "production"
  ? API_PATHS.issues
  : "/api/issues";

function allMediaImages(issue: Issue): Array<{ url: string; thumbnail?: string }> {
  if (!issue.media_urls || issue.media_urls.length === 0) return [];
  return issue.media_urls
    .filter((m) => m.url)
    .map((m) => ({ url: m.url!, thumbnail: m.url_thumbnail }));
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Unknown date";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);
  
  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
  }
}

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);
  const [canEdit, setCanEdit] = useState(false);

  // Analytics hooks
  useScrollTracking();
  useTimeTracking('/dashboard');
  const trackClick = useClickTracking();
  const { trackJourneyStep } = useAnalytics();

  useEffect(() => {
    // Check localStorage for edit access
    const hasEditAccess = localStorage.getItem('dev_edit_access') === 'true';
    setCanEdit(hasEditAccess);
  }, []);
  
  // Filter states
  const [selectedHashtag, setSelectedHashtag] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

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
        trackError('api_load_error', String(err), 'dashboard_initial_load');
        setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const handleRefresh = async () => {
    trackClick('Refresh Issues', EventCategory.USER_INTERACTION);
    setStatus("loading");
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const payload: IssuesResponse = await res.json();
      setIssues(payload.data?.issues || []);
      setStatus("ready");
      trackJourneyStep('dashboard_refreshed', { issue_count: payload.data?.issues?.length || 0 });
    } catch (err) {
      console.error("Failed to refresh issues", err);
      trackError('api_refresh_error', String(err), 'dashboard_refresh');
      setStatus("error");
    }
  };

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const hashtags = new Set<string>();
    const statuses = new Set<string>();
    const types = new Set<string>();
    
    issues.forEach((issue) => {
      if (issue.location?.locality?.hashtags) {
        issue.location.locality.hashtags.forEach(tag => hashtags.add(tag));
      }
      if (issue.status) statuses.add(issue.status);
      if (issue.type) types.add(issue.type);
    });
    
    return {
      hashtags: Array.from(hashtags).sort(),
      statuses: Array.from(statuses).sort(),
      types: Array.from(types).sort(),
    };
  }, [issues]);

  // Apply filters
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Hashtag filter
      if (selectedHashtag !== "all") {
        const issueHashtags = issue.location?.locality?.hashtags || [];
        if (!issueHashtags.includes(selectedHashtag)) return false;
      }
      
      // Status filter
      if (selectedStatus !== "all" && issue.status !== selectedStatus) {
        return false;
      }
      
      // Type filter
      if (selectedType !== "all" && issue.type !== selectedType) {
        return false;
      }
      
      return true;
    });
  }, [issues, selectedHashtag, selectedStatus, selectedType]);

  const totals = useMemo(() => {
    const totalVotes = filteredIssues.reduce((sum, issue) => sum + (issue.vote_count || 0), 0);
    const totalVerifications = filteredIssues.reduce((sum, issue) => sum + (issue.verify_count || 0), 0);
    return { count: filteredIssues.length, totalVotes, totalVerifications };
  }, [filteredIssues]);

  // Pagination logic
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredIssues.slice(startIndex, endIndex);
  }, [filteredIssues, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    trackClick(`Pagination - Page ${page}`, EventCategory.NAVIGATION, { page, total_pages: totalPages });
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when issues or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [issues.length, selectedHashtag, selectedStatus, selectedType]);

  const handleClearFilters = () => {
    trackClick('Clear All Filters', EventCategory.FILTER);
    setSelectedHashtag("all");
    setSelectedStatus("all");
    setSelectedType("all");
  };

  return (
    <section className="issues-dashboard">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Live city feed</p>
          <h1 className="hero-title">#local dashboard</h1>
          <p className="hero-subtitle">
            A city wide dashboard to view all the reported issues.
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

      {status === "ready" && issues.length > 0 && (
        <div className="filters-section">
          <div className="filters-header">
            <h3 className="filters-title">Filters</h3>
            {(selectedHashtag !== "all" || selectedStatus !== "all" || selectedType !== "all") && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear all
              </button>
            )}
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="hashtag-filter" className="filter-label">Hashtag</label>
              <select
                id="hashtag-filter"
                className="filter-select"
                value={selectedHashtag}
                onChange={(e) => {
                  setSelectedHashtag(e.target.value);
                  trackIssueFilter('hashtag', e.target.value);
                }}
              >
                <option value="all">All hashtags</option>
                {filterOptions.hashtags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="status-filter" className="filter-label">Status</label>
              <select
                id="status-filter"
                className="filter-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  trackIssueFilter('status', e.target.value);
                }}
              >
                <option value="all">All statuses</option>
                {filterOptions.statuses.map((stat) => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="type-filter" className="filter-label">Type</label>
              <select
                id="type-filter"
                className="filter-select"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  trackIssueFilter('type', e.target.value);
                }}
              >
                <option value="all">All types</option>
                {filterOptions.types.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          {filteredIssues.length === 0 && (
            <div className="no-results">
              No issues match the selected filters. Try adjusting your filters.
            </div>
          )}
        </div>
      )}

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

      {filteredIssues.length > 0 && (
        <>
          <div className="issues-grid">
            {paginatedIssues.map((issue) => {
              const mediaImages = allMediaImages(issue);
              const hashtags = issue.location?.locality?.hashtags || [];
              const locationLabel =
                issue.location?.colloquial_name || issue.location?.address || "Unknown location";
              return (
                <article className="issue-card" key={issue.id}>
                  <div className="issue-media">
                    {mediaImages.length > 0 ? (
                      <ImageSlideshow
                        images={mediaImages}
                        alt="Issue media"
                        imageClassName="issue-media__img"
                        loading="lazy"
                        decoding="async"
                      />
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
                    
                    <p className="time-ago">{formatTimeAgo(issue.created_at)}</p>
                  </div>

                  <footer className="issue-card__footer">
                    <Link
                      href={`/issue/${toIssueSlug(issue.id, issue.type, issue.location?.locality?.hashtags, issue.location?.colloquial_name || issue.location?.address)}`}
                      className="view-btn"
                      aria-label="View issue details"
                      onClick={() => {
                        trackClick(`View Issue ${issue.id}`, EventCategory.ISSUE, {
                          issue_id: String(issue.id),
                          issue_type: issue.type || 'unknown',
                          issue_status: issue.status || 'unknown',
                        });
                      }}
                    >
                      View
                    </Link>
                    {canEdit && (
                      <button 
                        className="edit-btn"
                        onClick={() => {
                          trackClick(`Edit Issue ${issue.id}`, EventCategory.ISSUE, { issue_id: issue.id });
                          setEditingIssue(issue);
                        }}
                        aria-label="Edit issue"
                      >
                        Edit
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                  const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return <span key={page} className="pagination-ellipsis">...</span>;
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {editingIssue && (
        <EditIssueModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onUpdate={handleRefresh}
        />
      )}
    </section>
  );
}
