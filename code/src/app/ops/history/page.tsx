"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { ReviewedAction, AdminIssueDetail } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Hash,
  ChevronDown,
  MapPin,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, string> = {
  REPORT: "bg-blue-600 text-white",
  VERIFY: "bg-amber-600 text-white",
  RESOLVE: "bg-emerald-600 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-900 text-green-300 border border-green-700",
  ONHOLD: "bg-yellow-900 text-yellow-300 border border-yellow-700",
  RESOLVED: "bg-zinc-700 text-zinc-300 border border-zinc-600",
  REJECTED: "bg-red-900 text-red-300 border border-red-700",
  PENDING: "bg-orange-900 text-orange-300 border border-orange-700",
};

function formatTime(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type IssueCache = Record<number, AdminIssueDetail | "loading" | "error">;

function IssueDetailPanel({ issue }: { issue: AdminIssueDetail }) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const photos = issue.media_urls ?? [];

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800">

      {/* Photos — matches ReviewCard exactly */}
      {photos.length > 0 ? (
        <div className="mb-3">
          <div className="relative rounded-lg overflow-hidden bg-zinc-800 h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[selectedPhoto]?.url ?? photos[selectedPhoto]?.url_thumbnail}
              alt="Issue photo"
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhoto(i)}
                    className={`w-2 h-2 rounded-full transition ${i === selectedPhoto ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(i)}
                  className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition ${
                    i === selectedPhoto ? "border-white" : "border-zinc-700 opacity-60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url_thumbnail ?? p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-lg bg-zinc-800 h-24 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-zinc-600" />
          <span className="text-zinc-600 text-sm ml-2">No media</span>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-zinc-300 mb-2">
        {issue.description || <span className="text-zinc-600 italic">No description</span>}
      </p>

      {/* Meta row — type, location, reporter */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {issue.type && (
          <span className="capitalize">{issue.type.toLowerCase().replace("_", " ")}</span>
        )}
        {issue.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {issue.location.colloquial_name ?? issue.location.address ?? "Unknown"}
          </span>
        )}
        {issue.user?.username && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {issue.user.username}
          </span>
        )}
        {issue.location?.lat != null && (
          <a
            href={`https://maps.google.com/?q=${issue.location.lat},${issue.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {issue.location.lat.toFixed(5)}, {issue.location.lng.toFixed(5)}
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 mt-2 text-xs text-zinc-500">
        <span>Verifications: {issue.verify_count ?? 0}</span>
        <span>Issue #{issue.id}</span>
        {issue.status && (
          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[issue.status] ?? "bg-zinc-700 text-zinc-300"}`}>
            {issue.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [actions, setActions] = useState<ReviewedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [issueCache, setIssueCache] = useState<IssueCache>({});

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.recentActions);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setActions(json.data ?? []);
    } catch (err) {
      toast.error(`Failed to load history: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleRow = useCallback(async (action: ReviewedAction) => {
    const id = action.action_id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const issueId = action.issue_id;
    if (issueCache[issueId]) return;

    setIssueCache((prev) => ({ ...prev, [issueId]: "loading" }));
    try {
      const res = await adminFetch(ADMIN_API.issue(issueId));
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const issue = json.data?.issue ?? json.data ?? json;
      setIssueCache((prev) => ({ ...prev, [issueId]: issue }));
    } catch {
      setIssueCache((prev) => ({ ...prev, [issueId]: "error" }));
    }
  }, [expandedId, issueCache]);

  const filtered = actions.filter((a) => {
    if (actionFilter && a.action !== actionFilter) return false;
    if (outcomeFilter && a.approval_status !== outcomeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Clock className="w-12 h-12 text-zinc-500" />
        <h2 className="text-xl font-semibold text-zinc-300">No history yet</h2>
        <p className="text-zinc-500 text-sm">Approved and rejected actions will appear here.</p>
        <Button onClick={fetchHistory} variant="outline" className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold text-zinc-200 mr-auto">
          Recently Reviewed ({actions.length})
        </h1>
        <Button onClick={fetchHistory} variant="ghost" size="sm" className="text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {[null, "REPORT", "VERIFY", "RESOLVE"].map((f) => (
            <button
              key={f ?? "all"}
              onClick={() => setActionFilter(f)}
              className={`px-2 py-1 text-xs rounded transition ${
                actionFilter === f ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {f ?? "All"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {[null, "APPROVED", "REJECTED"].map((f) => (
            <button
              key={f ?? "outcome-all"}
              onClick={() => setOutcomeFilter(f)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition ${
                outcomeFilter === f
                  ? f === "APPROVED"
                    ? "bg-emerald-700 text-white"
                    : f === "REJECTED"
                    ? "bg-red-700 text-white"
                    : "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {f === "APPROVED" && <CheckCircle2 className="w-3 h-3" />}
              {f === "REJECTED" && <XCircle className="w-3 h-3" />}
              {f ?? "All outcomes"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-zinc-500 text-sm">No results match your filters.</p>
          <button
            onClick={() => { setActionFilter(null); setOutcomeFilter(null); }}
            className="text-xs text-zinc-400 hover:text-white underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((action) => {
            const approved = action.approval_status === "APPROVED";
            const isExpanded = expandedId === action.action_id;
            const cachedIssue = issueCache[action.issue_id];

            return (
              <div
                key={action.action_id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
              >
                {/* Row — clickable to expand */}
                <button
                  onClick={() => toggleRow(action)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  {/* Outcome icon */}
                  <div className="flex-shrink-0">
                    {approved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  {/* Action type badge */}
                  <Badge
                    className={`text-xs font-semibold flex-shrink-0 ${ACTION_COLORS[action.action] ?? "bg-zinc-700 text-white"}`}
                  >
                    {action.action}
                  </Badge>

                  {/* Outcome badge */}
                  <Badge
                    className={`text-xs font-semibold flex-shrink-0 ${
                      approved
                        ? "bg-emerald-900 text-emerald-300 border border-emerald-700"
                        : "bg-red-900 text-red-300 border border-red-700"
                    }`}
                  >
                    {action.approval_status}
                  </Badge>

                  {/* Issue + user */}
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Hash className="w-3 h-3" />
                      Issue {action.issue_id}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <User className="w-3 h-3" />
                      {action.submitted_by_username}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-zinc-300">{formatTime(action.approved_at)}</p>
                    {action.approved_by_username && (
                      <p className="text-xs text-zinc-500">by {action.approved_by_username}</p>
                    )}
                  </div>

                  {/* Chevron — right side */}
                  <ChevronDown
                    className={`flex-shrink-0 w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expandable issue detail */}
                {isExpanded && (
                  <div>
                    {cachedIssue === "loading" && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading issue details…
                      </div>
                    )}
                    {cachedIssue === "error" && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed to load issue details.
                      </div>
                    )}
                    {cachedIssue && cachedIssue !== "loading" && cachedIssue !== "error" && (
                      <IssueDetailPanel issue={cachedIssue} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
