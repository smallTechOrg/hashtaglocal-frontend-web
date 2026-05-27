"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import {
  ReviewedAction,
  AdminIssueDetail,
  GovPortalReportFormValues,
  GovPortalDecision,
  ReportComplaintPayload,
  ReportComplaintResponse,
} from "../lib/types";
import { getGovPortalMetadataForHashtags } from "../lib/govPortalMetadata";
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
  MapPin,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface ActionGovState {
  decision: GovPortalDecision | null;
  trackingId: number | null;
  reporting: boolean;
  formValues: GovPortalReportFormValues;
}

function buildDefaultFormValues(issue?: AdminIssueDetail | null): GovPortalReportFormValues {
  return {
    source: "GOV_ISSUE_PORTAL",
    type: "REPORT_ISSUE",
    portal: "",
    category: "",
    subCategory: "",
    description: issue?.description ?? "",
    mediaUrl: issue?.media_urls?.[0]?.url ?? "",
    latitude: issue?.location?.lat?.toString() ?? "",
    longitude: issue?.location?.lng?.toString() ?? "",
    username: "",
    password: "",
  };
}

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

  // Expanded row + issue detail cache
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);
  const [issueCache, setIssueCache] = useState<Record<number, AdminIssueDetail>>({});
  const [issueLoadingSet, setIssueLoadingSet] = useState<Set<number>>(new Set());
  const [selectedPhotoMap, setSelectedPhotoMap] = useState<Record<number, number>>({});

  // Per-action gov portal state (keyed by action_id)
  const [govStateMap, setGovStateMap] = useState<Record<number, ActionGovState>>({});

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

  const fetchIssue = useCallback(async (issueId: number) => {
    if (issueCache[issueId] || issueLoadingSet.has(issueId)) return;
    setIssueLoadingSet((prev) => new Set(prev).add(issueId));
    try {
      const res = await adminFetch(ADMIN_API.issue(issueId));
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const issue: AdminIssueDetail = json.data?.issue;
      if (issue) {
        setIssueCache((prev) => ({ ...prev, [issueId]: issue }));
        // Initialise gov portal form values seeded from issue data
        const { localityKey, metadata } = getGovPortalMetadataForHashtags(
          issue.location?.locality?.hashtags,
        );
        const defaultCategory = metadata?.categories[0] ?? "";
        setGovStateMap((prev) => {
          // Only init actions whose forms haven't been touched yet
          const updated: Record<number, ActionGovState> = { ...prev };
          // We'll init all actions for this issue that aren't already in the map
          return updated;
        });
        // Store seeded values indexed by issueId for use when building per-action state
        setIssueCache((prev) => ({ ...prev, [issueId]: issue }));
        void localityKey; // used below via govStateMap initialisation on expand
        void defaultCategory;
      }
    } catch (err) {
      console.error(`Failed to fetch issue ${issueId}:`, err);
    } finally {
      setIssueLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    }
  }, [issueCache, issueLoadingSet]);

  const handleToggleExpand = useCallback(
    (action: ReviewedAction) => {
      const actionId = action.action_id;
      setExpandedActionId((prev) => {
        if (prev === actionId) return null;
        // Kick off issue fetch when expanding
        fetchIssue(action.issue_id);
        // Ensure gov state entry exists for this action
        setGovStateMap((prevMap) => {
          if (prevMap[actionId]) return prevMap;
          return {
            ...prevMap,
            [actionId]: {
              decision: null,
              trackingId: null,
              reporting: false,
              formValues: buildDefaultFormValues(null),
            },
          };
        });
        return actionId;
      });
    },
    [fetchIssue],
  );

  // When issue loads, seed form values for any action that targets this issue
  useEffect(() => {
    actions.forEach((a) => {
      const issue = issueCache[a.issue_id];
      if (!issue) return;
      setGovStateMap((prev) => {
        if (!prev[a.action_id]) return prev;
        const existing = prev[a.action_id];
        // Only seed if username/password untouched and description still empty/stale
        if (existing.formValues.description === issue.description) return prev;
        const { metadata } = getGovPortalMetadataForHashtags(
          issue.location?.locality?.hashtags,
        );
        const defaultCategory = metadata?.categories[0] ?? "";
        const defaultSubCategory =
          metadata?.subcategories[defaultCategory]?.[0] ?? "";
        return {
          ...prev,
          [a.action_id]: {
            ...existing,
            formValues: {
              ...existing.formValues,
              portal: metadata?.portals[0] ?? "",
              category: defaultCategory,
              subCategory: defaultSubCategory,
              description: issue.description ?? "",
              mediaUrl: issue.media_urls?.[0]?.url ?? "",
              latitude: issue.location?.lat?.toString() ?? "",
              longitude: issue.location?.lng?.toString() ?? "",
            },
          },
        };
      });
    });
  }, [issueCache, actions]);

  const updateGovState = useCallback(
    (actionId: number, patch: Partial<ActionGovState>) => {
      setGovStateMap((prev) => ({
        ...prev,
        [actionId]: { ...prev[actionId], ...patch },
      }));
    },
    [],
  );

  const updateGovFormValue = useCallback(
    (
      actionId: number,
      field: keyof GovPortalReportFormValues,
      value: string,
      metadata: ReturnType<typeof getGovPortalMetadataForHashtags>["metadata"],
    ) => {
      setGovStateMap((prev) => {
        const existing = prev[actionId];
        if (!existing) return prev;
        let newValues = { ...existing.formValues, [field]: value };
        if (field === "category") {
          const nextSubcategories = metadata?.subcategories[value] ?? [];
          newValues = { ...newValues, subCategory: nextSubcategories[0] ?? "" };
        }
        return { ...prev, [actionId]: { ...existing, formValues: newValues } };
      });
    },
    [],
  );

  const handleReportGovPortal = useCallback(
    async (actionId: number, issueId: number, values: GovPortalReportFormValues) => {
      const payload: ReportComplaintPayload = {
        source: values.source,
        context: {
          portal: values.portal,
          action: {
            type: values.type,
            data: {
              category: values.category,
              sub_category: values.subCategory,
              description: values.description,
              media_url: values.mediaUrl,
              latitude: values.latitude,
              longitude: values.longitude,
            },
          },
          auth: {
            username: values.username,
            password: values.password,
          },
        },
      };

      updateGovState(actionId, { reporting: true, trackingId: null });
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 300000);
      try {
        const res = await adminFetch(ADMIN_API.reportComplaint(issueId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          toast.error(`Report failed: ${text || res.status}`);
          return;
        }
        const json = (await res.json()) as ReportComplaintResponse;
        const trackingId = json.data?.tracking_id;
        if (typeof trackingId !== "number") {
          toast.error("Report succeeded but tracking ID was missing");
          return;
        }
        updateGovState(actionId, { trackingId });
        toast.success(`Issue #${issueId} reported. Tracking ID: ${trackingId}`, {
          duration: 2000,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          toast.error(
            "Gov portal request timed out after 300 seconds. Check the portal and retry if needed.",
            { duration: 5000 },
          );
          return;
        }
        toast.error(`Report failed: ${err}`);
      } finally {
        window.clearTimeout(timeoutId);
        updateGovState(actionId, { reporting: false });
      }
    },
    [updateGovState],
  );

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
            const isExpanded = expandedActionId === action.action_id;
            const issue = issueCache[action.issue_id] ?? null;
            const issueLoading = issueLoadingSet.has(action.issue_id);
            const govState = govStateMap[action.action_id];
            const { localityKey: govLocalityKey, metadata: govMetadata } =
              getGovPortalMetadataForHashtags(issue?.location?.locality?.hashtags);
            const photos = issue?.media_urls ?? [];
            const selectedPhoto = selectedPhotoMap[action.action_id] ?? 0;
            const subCategoryOptions =
              govMetadata?.subcategories[govState?.formValues?.category ?? ""] ??
              govMetadata?.subcategories[govMetadata?.categories[0] ?? ""] ??
              [];

            return (
              <div
                key={action.action_id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
              >
                {/* Row — clickable */}
                <button
                  onClick={() => handleToggleExpand(action)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/50 transition text-left"
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

                  {/* Expand chevron */}
                  <div className="flex-shrink-0 text-zinc-500">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    {issueLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
                      </div>
                    ) : issue ? (
                      <>
                        {/* Photos */}
                        {photos.length > 0 ? (
                          <div>
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
                                      onClick={() =>
                                        setSelectedPhotoMap((prev) => ({
                                          ...prev,
                                          [action.action_id]: i,
                                        }))
                                      }
                                      className={`w-2 h-2 rounded-full transition ${
                                        i === selectedPhoto ? "bg-white" : "bg-white/40"
                                      }`}
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
                                    onClick={() =>
                                      setSelectedPhotoMap((prev) => ({
                                        ...prev,
                                        [action.action_id]: i,
                                      }))
                                    }
                                    className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition ${
                                      i === selectedPhoto
                                        ? "border-white"
                                        : "border-zinc-700 opacity-60"
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={p.url_thumbnail ?? p.url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-zinc-800 h-24 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-600" />
                            <span className="text-zinc-600 text-sm ml-2">No media</span>
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-sm text-zinc-300">{issue.description}</p>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                          <span className="capitalize">
                            {issue.type.toLowerCase().replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {issue.location?.colloquial_name ?? issue.location?.address ?? "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {action.submitted_by_username}
                          </span>
                          <span>Verifications: {issue.verify_count}</span>
                          <span>Status: {issue.status}</span>
                        </div>

                        {/* Gov portal reporting */}
                        {govMetadata && govState && (
                          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-zinc-200">
                                  Report issue on gov portal?
                                </p>
                                <p className="text-xs text-zinc-500 capitalize">
                                  Locality: {govLocalityKey}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant={govState.decision === "YES" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    updateGovState(action.action_id, { decision: "YES" })
                                  }
                                  className={
                                    govState.decision === "YES"
                                      ? "bg-sky-600 text-white hover:bg-sky-500"
                                      : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                  }
                                >
                                  Yes
                                </Button>
                                <Button
                                  variant={govState.decision === "NO" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    updateGovState(action.action_id, { decision: "NO" })
                                  }
                                  className={
                                    govState.decision === "NO"
                                      ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                      : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                  }
                                >
                                  No
                                </Button>
                              </div>
                            </div>

                            {govState.decision === "YES" && (
                              <div className="space-y-2.5">
                                <p className="text-xs text-zinc-500">
                                  Submit this report and wait for the tracking ID response. The request can take up to 300 seconds.
                                </p>

                                {govState.trackingId !== null && (
                                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                                    Gov portal report submitted. Tracking ID: {govState.trackingId}
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <label className="text-xs text-zinc-400">
                                    Portal
                                    <select
                                      value={govState.formValues.portal}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "portal",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    >
                                      {govMetadata.portals.map((portal) => (
                                        <option key={portal} value={portal}>
                                          {portal}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-xs text-zinc-400">
                                    Category
                                    <select
                                      value={govState.formValues.category}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "category",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    >
                                      {govMetadata.categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-xs text-zinc-400">
                                    Sub-category
                                    <select
                                      value={govState.formValues.subCategory}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "subCategory",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    >
                                      {subCategoryOptions.map((sub) => (
                                        <option key={sub} value={sub}>
                                          {sub}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <label className="block text-xs text-zinc-400">
                                  Description (editable)
                                  <textarea
                                    value={govState.formValues.description}
                                    onChange={(e) =>
                                      updateGovFormValue(
                                        action.action_id,
                                        "description",
                                        e.target.value,
                                        govMetadata,
                                      )
                                    }
                                    rows={3}
                                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                  />
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <label className="text-xs text-zinc-400 sm:col-span-2">
                                    Media URL
                                    <input
                                      value={govState.formValues.mediaUrl}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "mediaUrl",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    />
                                  </label>
                                  <label className="text-xs text-zinc-400">
                                    Latitude
                                    <input
                                      value={govState.formValues.latitude}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "latitude",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    />
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                                  <label className="text-xs text-zinc-400">
                                    Longitude
                                    <input
                                      value={govState.formValues.longitude}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "longitude",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    />
                                  </label>
                                  <label className="text-xs text-zinc-400">
                                    Username
                                    <input
                                      value={govState.formValues.username}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "username",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      placeholder="Required"
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    />
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                                  <label className="text-xs text-zinc-400">
                                    Password
                                    <input
                                      type="password"
                                      value={govState.formValues.password}
                                      onChange={(e) =>
                                        updateGovFormValue(
                                          action.action_id,
                                          "password",
                                          e.target.value,
                                          govMetadata,
                                        )
                                      }
                                      placeholder="Required"
                                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                                    />
                                  </label>
                                  <Button
                                    onClick={() =>
                                      handleReportGovPortal(
                                        action.action_id,
                                        action.issue_id,
                                        govState.formValues,
                                      )
                                    }
                                    disabled={
                                      govState.reporting ||
                                      govState.trackingId !== null ||
                                      !govState.formValues.username ||
                                      !govState.formValues.password
                                    }
                                    className="h-9 bg-sky-600 hover:bg-sky-500 text-white"
                                  >
                                    {govState.reporting ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : govState.trackingId !== null ? (
                                      "Reported"
                                    ) : (
                                      "Submit to portal"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-zinc-600 text-sm">
                        Failed to load issue details
                      </div>
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
