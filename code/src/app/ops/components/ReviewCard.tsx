"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  MapPin,
  Clock,
  User,
  ArrowRight,
  ImageIcon,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  PendingAction,
  AdminIssueDetail,
  UserSummary,
  TransitionInfo,
  GovPortalReportFormValues,
  GovPortalDecision,
  getTransitionInfo,
} from "../lib/types";
import { useState, useRef, useCallback, useEffect } from "react";
import { GovPortalLocalityMetadata } from "../lib/govPortalMetadata";

interface ReviewCardProps {
  action: PendingAction;
  issue: AdminIssueDetail | null;
  issueLoading: boolean;
  userSummary: UserSummary | null;
  onApprove: (actionId: number) => void;
  onReject: (actionId: number) => void;
  onReportGovPortal: (values: GovPortalReportFormValues) => void;
  reportingGovPortal: boolean;
  govPortalLocalityKey?: string;
  govPortalMetadata?: GovPortalLocalityMetadata;
  govPortalDecision: GovPortalDecision | null;
  govPortalTrackingId: number | null;
  onGovPortalDecisionChange: (decision: GovPortalDecision | null) => void;
  canModerateAction: boolean;
  processing: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  REPORT: "bg-blue-600 text-white",
  VERIFY: "bg-amber-600 text-white",
  RESOLVE: "bg-emerald-600 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  ONHOLD: "bg-zinc-600 text-zinc-200",
  OPEN: "bg-blue-600 text-white",
  PENDING: "bg-amber-600 text-white",
  RESOLVED: "bg-emerald-600 text-white",
  REJECTED: "bg-red-600 text-white",
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

export default function ReviewCard({
  action,
  issue,
  issueLoading,
  userSummary,
  onApprove,
  onReject,
  onReportGovPortal,
  reportingGovPortal,
  govPortalLocalityKey,
  govPortalMetadata,
  govPortalDecision,
  govPortalTrackingId,
  onGovPortalDecisionChange,
  canModerateAction,
  processing,
}: ReviewCardProps) {
  const transition: TransitionInfo = getTransitionInfo(
    action.action,
    issue?.status ?? "UNKNOWN",
  );

  // --- Swipe handling ---
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (processing || !canModerateAction) return;
      touchStartX.current = e.touches[0].clientX;
      setSwiping(true);
    },
    [processing, canModerateAction],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swiping) return;
      const diff = e.touches[0].clientX - touchStartX.current;
      setSwipeX(diff);
    },
    [swiping],
  );

  const onTouchEnd = useCallback(() => {
    setSwiping(false);
    const THRESHOLD = 100;
    if (swipeX > THRESHOLD && !processing && canModerateAction) {
      onApprove(action.action_id);
    } else if (swipeX < -THRESHOLD && !processing && canModerateAction) {
      onReject(action.action_id);
    }
    setSwipeX(0);
  }, [
    swipeX,
    processing,
    canModerateAction,
    onApprove,
    onReject,
    action.action_id,
  ]);

  // Swipe color indicator
  const swipeBg =
    swipeX > 50
      ? "rgba(34,197,94,0.15)"
      : swipeX < -50
        ? "rgba(239,68,68,0.15)"
        : "transparent";

  // Selected photo for preview
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const photos = issue?.media_urls ?? [];

  // Reset selected photo when issue changes
  useEffect(() => {
    setSelectedPhoto(0);
  }, [issue?.id]);

  const [showGovPortalForm, setShowGovPortalForm] = useState(false);
  const metadata = govPortalMetadata;
  const [govFormValues, setGovFormValues] = useState<GovPortalReportFormValues>({
    source: "GOV_PORTAL_ISSUE",
    type: "REPORT_ISSUE",
    portal: metadata?.portals[0] ?? "",
    category: metadata?.categories[0] ?? "",
    subCategory: metadata?.subcategories[metadata?.categories[0] ?? ""]?.[0] ?? "",
    description: issue?.description ?? "",
    mediaUrl: issue?.media_urls?.[0]?.url ?? "",
    latitude: issue?.location?.lat?.toString() ?? "",
    longitude: issue?.location?.lng?.toString() ?? "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const defaultCategory = metadata?.categories[0] ?? "";
    const defaultSubCategory = metadata?.subcategories[defaultCategory]?.[0] ?? "";
    setGovFormValues({
      source: "GOV_PORTAL_ISSUE",
      type: "REPORT_ISSUE",
      portal: metadata?.portals[0] ?? "",
      category: defaultCategory,
      subCategory: defaultSubCategory,
      description: issue?.description ?? "",
      mediaUrl: issue?.media_urls?.[0]?.url ?? "",
      latitude: issue?.location?.lat?.toString() ?? "",
      longitude: issue?.location?.lng?.toString() ?? "",
      username: "",
      password: "",
    });
    setShowGovPortalForm(govPortalDecision === "YES");
  }, [
    issue?.id,
    issue?.description,
    issue?.media_urls,
    issue?.location,
    metadata,
    govPortalDecision,
  ]);

  const subCategoryOptions =
    metadata?.subcategories[govFormValues.category] ??
    metadata?.subcategories[metadata?.categories[0] ?? ""] ??
    [];

  const handleGovFormChange = (
    field: keyof GovPortalReportFormValues,
    value: string,
  ) => {
    setGovFormValues((prev) => {
      if (field === "category") {
        const nextSubcategories = metadata?.subcategories[value] ?? [];
        return {
          ...prev,
          category: value,
          subCategory: nextSubcategories[0] ?? "",
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleGovPortalSubmit = () => {
    if (!govFormValues.portal || !govFormValues.category || !govFormValues.subCategory) {
      return;
    }
    if (!govFormValues.username || !govFormValues.password) {
      return;
    }
    onReportGovPortal(govFormValues);
  };

  const moderationBlockedMessage =
    metadata && !canModerateAction
      ? govPortalDecision === "YES"
        ? "Submit the gov portal report and wait for the tracking ID before approving or rejecting."
        : "Choose Yes or No for gov portal reporting before approving or rejecting."
      : null;

  return (
    <div
      ref={cardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transform: `translateX(${swipeX}px) rotate(${swipeX * 0.02}deg)`,
        background: swipeBg,
        transition: swiping
          ? "none"
          : "transform 0.3s ease, background 0.3s ease",
      }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-w-lg w-full mx-auto"
    >
      {/* Header: action type + timing */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            className={ACTION_COLORS[action.action] ?? "bg-zinc-600 text-white"}
          >
            {action.action}
          </Badge>
          {issue && (
            <Badge
              variant="outline"
              className={STATUS_COLORS[issue.status] ?? ""}
            >
              {issue.status}
            </Badge>
          )}
        </div>
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(action.created_at)}
        </span>
      </div>

      {/* Issue content */}
      <div className="px-4 pb-3">
        {issueLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : issue ? (
          <>
            {/* Photos */}
            {photos.length > 0 && (
              <div className="mb-3">
                <div className="relative rounded-lg overflow-hidden bg-zinc-800 h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      photos[selectedPhoto]?.url ??
                      photos[selectedPhoto]?.url_thumbnail
                    }
                    alt="Issue photo"
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedPhoto(i)}
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
                        onClick={() => setSelectedPhoto(i)}
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
            )}

            {photos.length === 0 && (
              <div className="mb-3 rounded-lg bg-zinc-800 h-24 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-zinc-600" />
                <span className="text-zinc-600 text-sm ml-2">No media</span>
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-zinc-300 mb-2">{issue.description}</p>

            {/* Meta: type, location, reporter */}
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1 capitalize">
                {issue.type.toLowerCase().replace("_", " ")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {issue.location?.colloquial_name ??
                  issue.location?.address ??
                  "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {action.submitted_by_username}
              </span>
            </div>

            {/* Issue stats */}
            <div className="flex gap-4 mt-2 text-xs text-zinc-500">
              <span>Verifications: {issue.verify_count}</span>
              <span>Issue #{issue.id}</span>
            </div>

            {/* User stats panel */}
            {userSummary && (
              <div className="mt-3 p-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                  <BarChart3 className="w-3 h-3" />
                  <span className="font-medium">Submitter stats</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-semibold text-zinc-200">
                      {userSummary.issue_count.total}
                    </div>
                    <div className="text-[10px] text-zinc-500">Reported</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-emerald-400">
                      {userSummary.issue_count.resolved}
                    </div>
                    <div className="text-[10px] text-zinc-500">Resolved</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-amber-400">
                      {userSummary.issue_count.verify}
                    </div>
                    <div className="text-[10px] text-zinc-500">Verified</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-blue-400">
                      {userSummary.issue_count.open}
                    </div>
                    <div className="text-[10px] text-zinc-500">Open</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-zinc-400">
                      {userSummary.issue_count.onhold}
                    </div>
                    <div className="text-[10px] text-zinc-500">On Hold</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-teal-400">
                      {userSummary.issue_count.resolved_others}
                    </div>
                    <div className="text-[10px] text-zinc-500">Helped Resolve</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-24 flex items-center justify-center text-zinc-600 text-sm">
            Failed to load issue details
          </div>
        )}
      </div>

      {/* Transition preview */}
      <div className="px-4 pb-3 border-t border-zinc-800 pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Check className="w-3 h-3" />
            <span>{transition.approve.label}</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <Badge
              className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[transition.approve.toStatus] ?? "bg-zinc-600"}`}
            >
              {transition.approve.toStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <X className="w-3 h-3" />
            <span>{transition.reject.label}</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <Badge
              className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[transition.reject.toStatus] ?? "bg-zinc-600"}`}
            >
              {transition.reject.toStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 border-t border-zinc-800">
        <Button
          variant="ghost"
          onClick={() => onReject(action.action_id)}
          disabled={processing || !canModerateAction}
          className="rounded-none h-14 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-base font-medium"
        >
          {processing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <X className="w-5 h-5 mr-1" />
              Reject
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onApprove(action.action_id)}
          disabled={processing || !canModerateAction}
          className="rounded-none h-14 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-base font-medium border-l border-zinc-800"
        >
          {processing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-1" />
              Approve
            </>
          )}
        </Button>
      </div>

      {moderationBlockedMessage && (
        <div className="border-t border-zinc-800 px-4 py-2 text-xs text-amber-400 bg-amber-500/5">
          {moderationBlockedMessage}
        </div>
      )}

      {/* Gov portal reporting */}
      {metadata && (
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-zinc-200">Report issue on gov portal?</p>
            <p className="text-xs text-zinc-500 capitalize">Locality: {govPortalLocalityKey}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={govPortalDecision === "YES" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onGovPortalDecisionChange("YES");
                setShowGovPortalForm(true);
              }}
              className={
                govPortalDecision === "YES"
                  ? "bg-sky-600 text-white hover:bg-sky-500"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }
            >
              Yes
            </Button>
            <Button
              variant={govPortalDecision === "NO" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onGovPortalDecisionChange("NO");
                setShowGovPortalForm(false);
              }}
              className={
                govPortalDecision === "NO"
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }
            >
              No
            </Button>
          </div>
        </div>

        {govPortalDecision === null && (
          <p className="mt-3 text-xs text-amber-400">
            Choosing Yes or No is required before approving or rejecting.
          </p>
        )}

        {showGovPortalForm && govPortalDecision === "YES" && (
          <div className="mt-3 space-y-2.5">
            <p className="text-xs text-zinc-500">
              Submit this report and wait for the tracking ID response. The request can take up to 300 seconds.
            </p>

            {govPortalTrackingId !== null && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                Gov portal report submitted successfully. Tracking ID: {govPortalTrackingId}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Source (fixed)
                <input
                  value={govFormValues.source}
                  disabled
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-300"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Type (fixed)
                <input
                  value={govFormValues.type}
                  disabled
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-300"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-xs text-zinc-400">
                Portal
                <select
                  value={govFormValues.portal}
                  onChange={(e) => handleGovFormChange("portal", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                >
                  {metadata.portals.map((portal) => (
                    <option key={portal} value={portal}>
                      {portal}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-zinc-400">
                Category
                <select
                  value={govFormValues.category}
                  onChange={(e) => handleGovFormChange("category", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                >
                  {metadata.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-zinc-400">
                Sub-category
                <select
                  value={govFormValues.subCategory}
                  onChange={(e) => handleGovFormChange("subCategory", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                >
                  {subCategoryOptions.map((subCategory) => (
                    <option key={subCategory} value={subCategory}>
                      {subCategory}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-xs text-zinc-400">
              Description (editable)
              <textarea
                value={govFormValues.description}
                onChange={(e) => handleGovFormChange("description", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-xs text-zinc-400 sm:col-span-2">
                Media URL
                <input
                  value={govFormValues.mediaUrl}
                  onChange={(e) => handleGovFormChange("mediaUrl", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Latitude
                <input
                  value={govFormValues.latitude}
                  onChange={(e) => handleGovFormChange("latitude", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Longitude
                <input
                  value={govFormValues.longitude}
                  onChange={(e) => handleGovFormChange("longitude", e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Username
                <input
                  value={govFormValues.username}
                  onChange={(e) => handleGovFormChange("username", e.target.value)}
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
                  value={govFormValues.password}
                  onChange={(e) => handleGovFormChange("password", e.target.value)}
                  placeholder="Required"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200"
                />
              </label>

              <Button
                onClick={handleGovPortalSubmit}
                disabled={
                  reportingGovPortal ||
                  govPortalTrackingId !== null ||
                  !govFormValues.username ||
                  !govFormValues.password
                }
                className="h-9 bg-sky-600 hover:bg-sky-500 text-white"
              >
                {reportingGovPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : govPortalTrackingId !== null ? (
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

      {/* Swipe hint (mobile) */}
      <div className="px-4 py-2 text-center text-[10px] text-zinc-600 sm:hidden">
        Swipe right to approve &middot; Swipe left to reject
      </div>
    </div>
  );
}
