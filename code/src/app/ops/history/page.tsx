"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { ReviewedAction } from "../lib/types";
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
} from "lucide-react";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, string> = {
  REPORT: "bg-blue-600 text-white",
  VERIFY: "bg-amber-600 text-white",
  RESOLVE: "bg-emerald-600 text-white",
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

export default function HistoryPage() {
  const [actions, setActions] = useState<ReviewedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);

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
        {/* Action type filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {[null, "REPORT", "VERIFY", "RESOLVE"].map((f) => (
            <button
              key={f ?? "all"}
              onClick={() => setActionFilter(f)}
              className={`px-2 py-1 text-xs rounded transition ${
                actionFilter === f
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {f ?? "All"}
            </button>
          ))}
        </div>

        {/* Outcome filter */}
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
            return (
              <div
                key={action.action_id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4"
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

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Hash className="w-3 h-3" />
                      Issue {action.issue_id}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <User className="w-3 h-3" />
                      {action.submitted_by_username}
                    </span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-zinc-300">{formatTime(action.approved_at)}</p>
                  {action.approved_by_username && (
                    <p className="text-xs text-zinc-500">by {action.approved_by_username}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
