"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import {
  PendingAction,
  AdminIssueDetail,
  UserSummary,
  GovPortalReportFormValues,
  GovPortalDecision,
  ReportComplaintPayload,
  ReportComplaintResponse,
} from "../lib/types";
import ReviewCard from "../components/ReviewCard";
import { Loader2, PartyPopper, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getGovPortalMetadataForHashtags } from "../lib/govPortalMetadata";

export default function ReviewPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reportingGovPortal, setReportingGovPortal] = useState(false);
  const [govPortalDecision, setGovPortalDecision] = useState<
    GovPortalDecision | null
  >(null);
  const [govPortalTrackingId, setGovPortalTrackingId] = useState<number | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cache of fetched issue details keyed by issueId
  const [issueCache, setIssueCache] = useState<
    Record<number, AdminIssueDetail>
  >({});
  const [issueLoading, setIssueLoading] = useState(false);

  // Cache of user summaries keyed by userId
  const [userSummaryCache, setUserSummaryCache] = useState<
    Record<number, UserSummary>
  >({});

  const currentAction = actions[currentIndex] ?? null;

  // Fetch pending actions
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.pendingActions);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setActions(json.data ?? []);
      setCurrentIndex(0);
    } catch (err) {
      toast.error(`Failed to load pending actions: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Fetch issue detail when current action changes
  useEffect(() => {
    if (!currentAction) return;
    const issueId = currentAction.issue_id;

    // Already cached
    if (issueCache[issueId]) return;

    async function fetchIssue() {
      setIssueLoading(true);
      try {
        const res = await adminFetch(ADMIN_API.issue(issueId));
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        const issue = json.data?.issue;
        if (issue) {
          setIssueCache((prev) => ({ ...prev, [issueId]: issue }));
        }
      } catch (err) {
        console.error(`Failed to fetch issue ${issueId}:`, err);
      } finally {
        setIssueLoading(false);
      }
    }

    fetchIssue();
  }, [currentAction, issueCache]);

  // Fetch user summary when current action changes
  useEffect(() => {
    if (!currentAction) return;
    const userId = currentAction.submitted_by_user_id;
    if (!userId || userSummaryCache[userId]) return;

    async function fetchUserSummary() {
      try {
        const res = await adminFetch(ADMIN_API.userSummary(userId));
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setUserSummaryCache((prev) => ({ ...prev, [userId]: json.data }));
        }
      } catch {
        // Silently ignore – user stats are non-critical
      }
    }

    fetchUserSummary();
  }, [currentAction, userSummaryCache]);

  // Pre-fetch the next action's issue + user summary
  useEffect(() => {
    const nextAction = actions[currentIndex + 1];
    if (!nextAction) return;

    const nextIssueId = nextAction.issue_id;
    if (!issueCache[nextIssueId]) {
      (async () => {
        try {
          const res = await adminFetch(ADMIN_API.issue(nextIssueId));
          if (!res.ok) return;
          const json = await res.json();
          const issue = json.data?.issue;
          if (issue) {
            setIssueCache((prev) => ({ ...prev, [nextIssueId]: issue }));
          }
        } catch {
          // Silently ignore prefetch failures
        }
      })();
    }

    const nextUserId = nextAction.submitted_by_user_id;
    if (nextUserId && !userSummaryCache[nextUserId]) {
      (async () => {
        try {
          const res = await adminFetch(ADMIN_API.userSummary(nextUserId));
          if (!res.ok) return;
          const json = await res.json();
          if (json.data) {
            setUserSummaryCache((prev) => ({
              ...prev,
              [nextUserId]: json.data,
            }));
          }
        } catch {
          // Silently ignore
        }
      })();
    }
  }, [currentIndex, actions, issueCache, userSummaryCache]);

  // Navigate without acting
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(actions.length - 1, prev + 1));
  }, [actions.length]);

  const currentIssue = currentAction ? issueCache[currentAction.issue_id] ?? null : null;
  const currentUserSummary = currentAction
    ? userSummaryCache[currentAction.submitted_by_user_id] ?? null
    : null;
  const { localityKey: govPortalLocalityKey, metadata: govPortalMetadata } =
    getGovPortalMetadataForHashtags(currentIssue?.location?.locality?.hashtags);
  const requiresGovPortalDecision = Boolean(govPortalMetadata);
  const canModerateCurrentAction =
    !requiresGovPortalDecision ||
    govPortalDecision === "NO" ||
    govPortalTrackingId !== null;

  useEffect(() => {
    setGovPortalDecision(null);
    setGovPortalTrackingId(null);
  }, [currentAction?.action_id]);

  const handleReportGovPortal = useCallback(
    async (values: GovPortalReportFormValues) => {
      if (!currentIssue) {
        toast.error("Issue details are not loaded yet");
        return;
      }

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

      setReportingGovPortal(true);
      setGovPortalTrackingId(null);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 300000);
      try {
        const res = await adminFetch(ADMIN_API.reportComplaint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

        setGovPortalTrackingId(trackingId);
        toast.success(`Issue #${currentIssue.id} reported. Tracking ID: ${trackingId}`, {
          duration: 2000,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          toast.error(
            "Gov portal request timed out after 300 seconds. Check on the gov portal and retry if needed.",
            { duration: 5000 },
          );
          return;
        }
        toast.error(`Report failed: ${err}`);
      } finally {
        window.clearTimeout(timeoutId);
        setReportingGovPortal(false);
      }
    },
    [currentIssue],
  );

  const handleApprove = useCallback(
    async (actionId: number) => {
      if (!canModerateCurrentAction) {
        toast.error(
          requiresGovPortalDecision && govPortalDecision === "YES"
            ? "Submit the gov portal report and wait for a tracking ID before approving."
            : "Choose Yes or No for gov portal reporting before approving.",
        );
        return;
      }

      setProcessing(true);
      try {
        const res = await adminFetch(ADMIN_API.approveAction(actionId), {
          method: "PUT",
        });
        if (!res.ok) {
          const text = await res.text();
          toast.error(`Approve failed: ${text}`);
          return;
        }
        toast.success("Approved", { duration: 1500 });

        if (currentAction) {
          setIssueCache((prev) => {
            const copy = { ...prev };
            delete copy[currentAction.issue_id];
            return copy;
          });
        }

        setCurrentIndex((prev) => prev + 1);
      } catch (err) {
        toast.error(`Error: ${err}`);
      } finally {
        setProcessing(false);
      }
    },
    [canModerateCurrentAction, currentAction, govPortalDecision, requiresGovPortalDecision],
  );

  const handleReject = useCallback(
    async (actionId: number) => {
      if (!canModerateCurrentAction) {
        toast.error(
          requiresGovPortalDecision && govPortalDecision === "YES"
            ? "Submit the gov portal report and wait for a tracking ID before rejecting."
            : "Choose Yes or No for gov portal reporting before rejecting.",
        );
        return;
      }

      setProcessing(true);
      try {
        const res = await adminFetch(ADMIN_API.rejectAction(actionId), {
          method: "PUT",
        });
        if (!res.ok) {
          const text = await res.text();
          toast.error(`Reject failed: ${text}`);
          return;
        }
        toast.success("Rejected", { duration: 1500 });

        if (currentAction) {
          setIssueCache((prev) => {
            const copy = { ...prev };
            delete copy[currentAction.issue_id];
            return copy;
          });
        }

        setCurrentIndex((prev) => prev + 1);
      } catch (err) {
        toast.error(`Error: ${err}`);
      } finally {
        setProcessing(false);
      }
    },
    [canModerateCurrentAction, currentAction, govPortalDecision, requiresGovPortalDecision],
  );

  // Keyboard shortcuts: ←/→ navigate, ↑ approve, ↓ reject
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (processing || !currentAction) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleApprove(currentAction.action_id);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleReject(currentAction.action_id);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [processing, currentAction, handleApprove, handleReject, handlePrev, handleNext]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  // Empty queue
  if (!currentAction) {
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
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-zinc-500">
          {currentIndex + 1} of {actions.length}
        </span>
        <div className="flex-1 mx-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / actions.length) * 100}%` }}
          />
        </div>
        <Button
          onClick={fetchPending}
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:text-zinc-300"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Card */}
      <ReviewCard
        action={currentAction}
        issue={currentIssue}
        issueLoading={issueLoading && !currentIssue}
        userSummary={currentUserSummary}
        onApprove={handleApprove}
        onReject={handleReject}
        onReportGovPortal={handleReportGovPortal}
        reportingGovPortal={reportingGovPortal}
        govPortalLocalityKey={govPortalLocalityKey}
        govPortalMetadata={govPortalMetadata}
        govPortalDecision={govPortalDecision}
        govPortalTrackingId={govPortalTrackingId}
        onGovPortalDecisionChange={setGovPortalDecision}
        canModerateAction={canModerateCurrentAction}
        processing={processing}
      />

      {/* Navigation buttons */}
      <div className="flex justify-center mt-4 gap-3">
        <Button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          variant="outline"
          size="sm"
          className="text-zinc-400 border-zinc-700 hover:bg-zinc-800 disabled:opacity-30"
        >
          &larr; Prev
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentIndex >= actions.length - 1}
          variant="outline"
          size="sm"
          className="text-zinc-400 border-zinc-700 hover:bg-zinc-800 disabled:opacity-30"
        >
          Next &rarr;
        </Button>
      </div>

      {/* Keyboard shortcuts hint (desktop) */}
      <div className="hidden sm:flex justify-center mt-3 gap-4 text-xs text-zinc-600">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] mr-1">
            &larr;
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] mr-1">
            &rarr;
          </kbd>
          Navigate
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] mr-1">
            &uarr;
          </kbd>
          Approve
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] mr-1">
            &darr;
          </kbd>
          Reject
        </span>
      </div>
    </div>
  );
}
