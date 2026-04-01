"use client";
import React, { useState, useEffect } from "react";
import { API_PATHS } from "../../constants/api";
import { CITY_OPTIONS } from "../../constants/cityOptions";
import type { IssueStory, IssueStoriesResponse, TimelineEvent } from "../../models/issueStory";
import type { Issue } from "../../models/issue";

// --- Helpers ---

const ISSUE_TYPE_META: Record<string, { emoji: string; color: string }> = {
  pothole:   { emoji: "🕳️", color: "#bb3e03" },
  waste:     { emoji: "🗑️", color: "#ca6702" },
  footpath:  { emoji: "🚶", color: "#005f73" },
  pollution: { emoji: "🌫️", color: "#0a9396" },
  hygiene:   { emoji: "🧼", color: "#256d1b" },
  safety:    { emoji: "🛡️", color: "#ae2012" },
  other:     { emoji: "📌", color: "#5b3000" },
};

const EVENT_META: Record<string, { label: string; icon: string }> = {
  REPORTED:         { label: "Reported",  icon: "📢" },
  VERIFIED:         { label: "Verified",  icon: "✅" },
  PORTAL_SUBMITTED: { label: "Gov Portal", icon: "🏛️" },
  RESOLVED:         { label: "Resolved",  icon: "🎉" },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function cityLabel(cityValue: string): string {
  const city = CITY_OPTIONS.find(c => c.value === cityValue);
  return city ? city.label : cityValue;
}

// --- Sub-components ---

function TimelineStepper({ timeline }: { timeline: TimelineEvent[] }) {
  const ALL_STEPS = ["REPORTED", "VERIFIED", "PORTAL_SUBMITTED", "RESOLVED"];
  const completedEvents = new Set(timeline.map(t => t.event));

  return (
    <div className="flex items-start gap-0 w-full mt-4 overflow-x-auto pb-1">
      {ALL_STEPS.map((step, i) => {
        const isCompleted = completedEvents.has(step);
        const meta = EVENT_META[step] || { label: step, icon: "•" };
        const event = timeline.find(t => t.event === step);
        const isLast = step === "RESOLVED" && isCompleted;

        return (
          <div key={step} className="flex items-start flex-1 min-w-0">
            {/* Step node */}
            <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg border-2 transition-all shrink-0 ${
                  isLast
                    ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-200/50"
                    : isCompleted
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-gray-300 bg-gray-50"
                }`}
                title={event?.details || meta.label}
              >
                {meta.icon}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold mt-1.5 text-center leading-tight ${
                  isCompleted ? "text-gray-800" : "text-gray-400"
                }`}
              >
                {meta.label}
              </span>
              {isCompleted && event?.timestamp && (
                <span className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 text-center">
                  {formatDate(event.timestamp)}
                </span>
              )}
            </div>

            {/* Connector line */}
            {i < ALL_STEPS.length - 1 && (
              <div className="flex-1 flex items-center pt-[18px] sm:pt-[20px] min-w-[12px]">
                <div
                  className={`h-[2px] w-full ${
                    isCompleted && completedEvents.has(ALL_STEPS[i + 1])
                      ? "bg-emerald-500"
                      : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StoryCard({ story }: { story: IssueStory }) {
  const { issue, timeline, resolution_days: resolutionDays } = story;
  const typeMeta = ISSUE_TYPE_META[(issue.type || "other").toLowerCase()] || ISSUE_TYPE_META.other;
  const thumbnail = issue.media_urls?.[0]?.url_thumbnail || issue.media_urls?.[0]?.url;
  const locationName = issue.location?.colloquial_name || issue.location?.address || "Unknown location";
  const portalData = (issue as Issue & { gov_portal_data?: Array<{ portal_track_link?: string; portal_name?: string; tracking_id?: string }> }).gov_portal_data;
  const hasPortal = portalData && portalData.length > 0;

  return (
    <article
      className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Left: Thumbnail */}
        {thumbnail ? (
          <div className="relative w-full sm:w-48 md:w-56 h-40 sm:h-auto shrink-0">
            <img
              src={thumbnail}
              alt={issue.description?.slice(0, 60) || "Issue photo"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Type badge overlay */}
            <span
              className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: typeMeta.color }}
            >
              {typeMeta.emoji} {issue.type}
            </span>
          </div>
        ) : (
          <div className="relative w-full sm:w-48 md:w-56 h-40 sm:h-auto shrink-0 bg-gray-100 flex items-center justify-center">
            <span className="text-5xl">{typeMeta.emoji}</span>
            <span
              className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: typeMeta.color }}
            >
              {issue.type}
            </span>
          </div>
        )}

        {/* Right: Content */}
        <div className="flex flex-col flex-1 p-4 sm:p-5 min-w-0">
          {/* Top row: location + resolution stat */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {locationName}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Reported {formatDate(issue.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-700 font-bold text-sm sm:text-base">
                  {resolutionDays}
                </span>
                <span className="text-emerald-600 text-[10px] sm:text-xs font-medium">
                  {resolutionDays === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1">
            {issue.description || "No description provided"}
          </p>

          {/* Gov portal link */}
          {hasPortal && portalData?.[0] && (
            <a
              href={portalData[0].portal_track_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-dark-teal hover:underline mt-1 w-fit"
              style={{ color: "#005f73" }}
            >
              🏛️ Track on {portalData[0].portal_name || "Government Portal"}
              <span className="text-[10px]">↗</span>
            </a>
          )}

          {/* Timeline */}
          <TimelineStepper timeline={timeline} />
        </div>
      </div>
    </article>
  );
}

// --- Skeleton ---

function StoryCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-48 md:w-56 h-40 sm:h-48 bg-gray-200 shrink-0" />
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="h-8 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="flex gap-4 mt-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="h-2 w-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

interface StoryOfIssuesProps {
  selectedCity: string;
}

export default function StoryOfIssues({ selectedCity }: StoryOfIssuesProps) {
  const [stories, setStories] = useState<IssueStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStories() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(API_PATHS.issueStories(selectedCity), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: IssueStoriesResponse = await res.json();
        if (!cancelled) {
          setStories(payload.data?.stories || []);
        }
      } catch (err) {
        console.error("Failed to load issue stories", err);
        if (!cancelled) {
          setError(true);
          setStories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStories();
    return () => { cancelled = true; };
  }, [selectedCity]);

  // Hide section entirely if no stories and not loading
  if (!loading && stories.length === 0) return null;

  const city = cityLabel(selectedCity);

  return (
    <section className="mb-6 mt-2">
      {/* Section Header */}
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
          Stories of Change
        </h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          How issues in <span className="font-medium text-dark-teal" style={{ color: "#005f73" }}>{city}</span> got resolved through community action
        </p>
      </div>

      {/* Stories list */}
      <div className="space-y-4">
        {loading ? (
          <>
            <StoryCardSkeleton />
            <StoryCardSkeleton />
          </>
        ) : error ? (
          <div className="text-center text-sm text-gray-400 py-6">
            Unable to load stories right now
          </div>
        ) : (
          stories.map((story) => (
            <StoryCard key={story.issue.id} story={story} />
          ))
        )}
      </div>
    </section>
  );
}
