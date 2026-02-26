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
  getTransitionInfo,
} from "../lib/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface ReviewCardProps {
  action: PendingAction;
  issue: AdminIssueDetail | null;
  issueLoading: boolean;
  userSummary: UserSummary | null;
  onApprove: (actionId: number) => void;
  onReject: (actionId: number) => void;
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  }, []);

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
    if (swipeX > THRESHOLD && !processing) {
      onApprove(action.action_id);
    } else if (swipeX < -THRESHOLD && !processing) {
      onReject(action.action_id);
    }
    setSwipeX(0);
  }, [swipeX, processing, onApprove, onReject, action.action_id]);

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
          disabled={processing}
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
          disabled={processing}
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

      {/* Swipe hint (mobile) */}
      <div className="px-4 py-2 text-center text-[10px] text-zinc-600 sm:hidden">
        Swipe right to approve &middot; Swipe left to reject
      </div>
    </div>
  );
}
