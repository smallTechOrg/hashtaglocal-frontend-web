"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { PendingAction, AdminIssueDetail, getTransitionInfo } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Loader2,
  RefreshCw,
  PartyPopper,
  Clock,
  Filter,
  MapPin,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, string> = {
  REPORT: "bg-blue-600 text-white",
  VERIFY: "bg-amber-600 text-white",
  RESOLVE: "bg-emerald-600 text-white",
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function BulkListPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [issueCache, setIssueCache] = useState<Record<number, AdminIssueDetail>>({});

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.pendingActions);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setActions(json.data ?? []);
      setSelected(new Set());
    } catch (err) {
      toast.error(`Failed to load: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Fetch issue details for all actions (batch)
  useEffect(() => {
    if (actions.length === 0) return;

    const uncachedIds = [
      ...new Set(actions.map((a) => a.issue_id).filter((id) => !issueCache[id])),
    ];
    if (uncachedIds.length === 0) return;

    uncachedIds.forEach(async (issueId) => {
      try {
        const res = await adminFetch(ADMIN_API.issue(issueId));
        if (!res.ok) return;
        const json = await res.json();
        const issue = json.data?.issue;
        if (issue) {
          setIssueCache((prev) => ({ ...prev, [issueId]: issue }));
        }
      } catch {
        // Silently ignore
      }
    });
  }, [actions, issueCache]);

  const filtered = filter
    ? actions.filter((a) => a.action === filter)
    : actions;

  function toggleSelect(actionId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.action_id)));
    }
  }

  async function bulkAction(decision: "approve" | "reject") {
    if (selected.size === 0) {
      toast.warning("No actions selected");
      return;
    }
    setProcessing(true);
    let successes = 0;
    let failures = 0;

    const promises = Array.from(selected).map(async (actionId) => {
      try {
        const url =
          decision === "approve"
            ? ADMIN_API.approveAction(actionId)
            : ADMIN_API.rejectAction(actionId);
        const res = await adminFetch(url, { method: "PUT" });
        if (res.ok) successes++;
        else failures++;
      } catch {
        failures++;
      }
    });

    await Promise.all(promises);
    setProcessing(false);

    if (failures === 0) {
      toast.success(
        `${decision === "approve" ? "Approved" : "Rejected"} ${successes} action${successes > 1 ? "s" : ""}`,
      );
    } else {
      toast.warning(`${successes} succeeded, ${failures} failed`);
    }

    fetchPending();
  }

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
        <PartyPopper className="w-12 h-12 text-zinc-500" />
        <h2 className="text-xl font-semibold text-zinc-300">All caught up!</h2>
        <p className="text-zinc-500 text-sm">No pending actions to review.</p>
        <Button onClick={fetchPending} variant="outline" className="mt-2">
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
          Pending Actions ({actions.length})
        </h1>

        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {[null, "REPORT", "VERIFY", "RESOLVE"].map((f) => (
            <button
              key={f ?? "all"}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition ${
                filter === f
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {f ?? "All"}
            </button>
          ))}
        </div>

        <Button
          onClick={fetchPending}
          variant="ghost"
          size="sm"
          className="text-zinc-500"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Select all + bulk actions */}
      <div className="flex items-center gap-3 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={selectAll}
            className="rounded border-zinc-600"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() => bulkAction("approve")}
              disabled={processing}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
            >
              {processing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Approve ({selected.size})
                </>
              )}
            </Button>
            <Button
              onClick={() => bulkAction("reject")}
              disabled={processing}
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
            >
              {processing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Reject ({selected.size})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Action cards */}
      <div className="space-y-3">
        {filtered.map((action) => {
          const issue = issueCache[action.issue_id] ?? null;
          const transition = getTransitionInfo(action.action, issue?.status ?? "");
          const thumbnail =
            issue?.media_urls?.[0]?.url_thumbnail ?? issue?.media_urls?.[0]?.url;
          const isSelected = selected.has(action.action_id);

          return (
            <div
              key={action.action_id}
              className={`flex gap-3 p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "bg-zinc-800/80 border-zinc-600"
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50"
              }`}
              onClick={() => toggleSelect(action.action_id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(action.action_id)}
                className="rounded border-zinc-600 flex-shrink-0 mt-1"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Image thumbnail */}
              <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-zinc-800">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className={`text-xs ${ACTION_COLORS[action.action] ?? ""}`}
                  >
                    {action.action}
                  </Badge>
                  <span className="text-sm font-medium text-zinc-300">
                    Issue #{action.issue_id}
                  </span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1 ml-auto flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(action.created_at)}
                  </span>
                </div>

                {issue ? (
                  <>
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-1.5">
                      {issue.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {issue.location?.colloquial_name ??
                          issue.location?.address ??
                          "Unknown"}
                      </span>
                      <span>by {action.submitted_by_username}</span>
                      {issue.verify_count > 0 && (
                        <span>{issue.verify_count} verifications</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-8 flex items-center">
                    <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                  </div>
                )}

                {/* Transition preview */}
                <div className="flex gap-4 mt-1.5 text-[11px]">
                  <span className="text-emerald-500/70">
                    ✓ {transition.approve.label}
                  </span>
                  <span className="text-red-500/70">
                    ✗ {transition.reject.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
