"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  Image as ImageIcon,
  Pin,
} from "lucide-react";
import type { FeedPost } from "../../models/feed";

/** Relative "time ago" for a post timestamp. */
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusBadge(post: FeedPost) {
  switch (post.status) {
    case "PENDING_AI":
      return { label: "Pending review", cls: "bg-amber-100 text-amber-800" };
    case "FLAGGED":
      return { label: "Awaiting review", cls: "bg-amber-100 text-amber-800" };
    case "AI_BLOCKED":
      return { label: "Blocked", cls: "bg-red-100 text-red-700" };
    case "ADMIN_HIDDEN":
      return { label: "Hidden", cls: "bg-zinc-200 text-zinc-600" };
    default:
      return null;
  }
}

export function FeedPostCard({ post }: { post: FeedPost }) {
  const author = post.author?.username ?? (post.author ? "Member" : "#local");
  const isSystem = !post.author;
  const badge = statusBadge(post);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-sm font-semibold text-zinc-800">
          {isSystem ? "📣 #local" : author}
        </span>
        <span className="text-xs text-zinc-400">{timeAgo(post.created_at)}</span>
        {post.pinned && <Pin className="h-3 w-3 text-emerald-600" />}
        {badge && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100">
        <PostBody post={post} />
      </div>
    </div>
  );
}

function PostBody({ post }: { post: FeedPost }) {
  switch (post.kind) {
    case "LINK":
      return <LinkBody post={post} />;
    case "MEDIA":
      return <MediaBody post={post} />;
    case "ISSUE_REF":
      return <RefBody post={post} kind="issue" />;
    case "EVENT_REF":
      return <RefBody post={post} kind="event" />;
    default:
      return <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">{post.text}</p>;
  }
}

function LinkBody({ post }: { post: FeedPost }) {
  const pending = post.scrape_status === "PENDING";
  return (
    <div className="flex flex-col gap-2">
      {post.text && (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">{post.text}</p>
      )}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl border border-zinc-200 transition hover:border-zinc-300"
      >
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt={post.title ?? "link preview"}
            className="h-40 w-full object-cover"
          />
        )}
        <div className="flex flex-col gap-1 p-3">
          <span className="line-clamp-2 text-sm font-medium text-zinc-800">
            {post.title ?? (pending ? "Loading preview…" : post.url)}
          </span>
          <span className="flex items-center gap-1 truncate text-xs text-zinc-400">
            <ExternalLink className="h-3 w-3" />
            {hostOf(post.url)}
          </span>
        </div>
      </a>
    </div>
  );
}

function MediaBody({ post }: { post: FeedPost }) {
  return (
    <div className="flex flex-col gap-2">
      {post.text && (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">{post.text}</p>
      )}
      {post.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt="attachment"
          className="max-h-80 w-full rounded-xl object-cover"
        />
      ) : (
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <ImageIcon className="h-3 w-3" /> media
        </span>
      )}
    </div>
  );
}

function RefBody({ post, kind }: { post: FeedPost; kind: "issue" | "event" }) {
  const refId = kind === "issue" ? post.issue_id : post.event_id;
  const Icon = kind === "issue" ? AlertTriangle : CalendarDays;
  const label = kind === "issue" ? "Issue reported nearby" : "Upcoming event";
  const href = kind === "issue" && refId ? `/issue/${refId}` : undefined;
  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <Icon className="h-5 w-5 shrink-0 text-emerald-600" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-800">{post.text ?? label}</span>
        <span className="text-xs text-zinc-400">
          {kind === "issue" ? "View issue" : "View event"} #{refId}
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
