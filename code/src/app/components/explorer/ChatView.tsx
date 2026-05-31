"use client";

import { useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { useFeed } from "../feed/useFeed";
import { useProfile } from "../feed/useProfile";
import { FeedComposer } from "../feed/FeedComposer";
import IssueRefCard from "./IssueRefCard";
import type { FeedPost } from "../../models/feed";
import { formatTimeAgo } from "./layerConfig";

/**
 * Compact chat panel for the home Chat tab. A dense, inline message stream (small username + text
 * on one line) with a compose bar pinned at the bottom. Reads the feed for {@link hashtag}; for the
 * root (#india) it aggregates all child localities.
 *
 * <p>Message bodies are routed by {@code kind} ({@link ChatBody}), so future rich kinds (POLL, QUIZ,
 * richer LINK/MEDIA cards) slot in by adding a branch — the row chrome stays the same.
 */
export default function ChatView({
  hashtag,
  onClose,
}: {
  hashtag: string;
  onClose?: () => void;
}) {
  // The root channel aggregates children; specific localities show just their own feed.
  const isRoot = hashtag.replace(/^#/, "").toLowerCase() === "india";
  const { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload } = useFeed(
    hashtag,
    { aggregate: isRoot },
  );
  const { isAdmin } = useProfile();

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement | null>(null);
  // Tracks the newest post id we've seen, to detect new messages (vs. older-page loads).
  const newestSeenRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll the container itself to its full height. Relying on a zero-height anchor's
    // scrollIntoView left the stream a hair short of the bottom (flex gap + sub-pixel rounding).
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  // Is the viewer currently near the bottom of the stream? (Used to keep them pinned through
  // layout changes without overriding a deliberate scroll-up to read history.)
  function isNearBottom(): boolean {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Reset the "initial scroll" latch when the channel changes, so switching hashtags re-pins
  // the new channel to the bottom.
  useEffect(() => {
    didInitialScrollRef.current = false;
    newestSeenRef.current = null;
  }, [hashtag]);

  // Older messages load when the user scrolls to the top (chat grows upward).
  useEffect(() => {
    const el = topSentinel.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { root: scrollRef.current, rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, posts.length]);

  // Auto-scroll to the newest message: once after first load (and after a channel switch), and
  // whenever a NEW message arrives. Loading OLDER pages (scroll-up) must not yank down, so we only
  // scroll when the newest post id changes — not when older posts are prepended.
  const newestId = posts.length > 0 ? posts[0].id : null; // API is newest-first
  useEffect(() => {
    if (loading) return;
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      newestSeenRef.current = newestId;
      // Defer so the just-rendered rows are measured before we jump to the end.
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }
    if (newestId !== null && newestId !== newestSeenRef.current) {
      newestSeenRef.current = newestId;
      scrollToBottom("smooth");
    }
  }, [newestId, loading]);

  // Keep pinned to the bottom through async layout shifts (images loading, panel resize) — but only
  // when the viewer is already at the bottom, so reading history isn't interrupted.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (isNearBottom()) scrollToBottom("auto");
    });
    // Observe the stream and its content wrapper for height changes.
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [posts.length, loading]);

  // Newest-at-bottom (chat convention): reverse the newest-first API order.
  const ordered = [...posts].reverse();
  const label = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;

  return (
    <div className="xp-chat">
      <div className="xp-chat-header">
        <div className="xp-chat-header-text">
          <span className="xp-chat-title">{label}</span>
          <span className="xp-chat-sub">
            {isRoot ? "All localities + national updates" : "Locality chat"}
          </span>
        </div>
        {onClose && (
          <button
            className="xp-icon-btn xp-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="xp-chat-stream" ref={scrollRef}>
        {loading ? (
          <div className="xp-chat-loading">
            <Loader2 className="xp-spin" /> Loading chat…
          </div>
        ) : error ? (
          <div className="xp-chat-error">Couldn&apos;t load chat. {error}</div>
        ) : (
          <>
            <div ref={topSentinel} />
            {loadingMore && (
              <div className="xp-chat-loading">
                <Loader2 className="xp-spin" /> Loading older…
              </div>
            )}
            {pinned.map((p) => (
              <ChatRow key={`pin-${p.id}`} post={p} pinned showTag={isRoot} />
            ))}
            {ordered.length === 0 && pinned.length === 0 ? (
              <div className="xp-chat-empty">No messages yet. Say something.</div>
            ) : (
              ordered.map((p) => <ChatRow key={p.id} post={p} showTag={isRoot} />)
            )}
          </>
        )}
      </div>

      <div className="xp-chat-compose">
        <FeedComposer onPosted={reload} hashtag={label} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

/**
 * One chat row: compact inline header (author · tag · time) followed by the body. Dense by default;
 * the body grows for rich kinds.
 */
function ChatRow({
  post,
  pinned,
  showTag,
}: {
  post: FeedPost;
  pinned?: boolean;
  showTag?: boolean;
}) {
  const isSystem = !post.author;
  const name = isSystem ? "#local" : post.author?.username ?? "member";
  const tag = post.hashtag?.replace(/^#/, "");

  return (
    <div className={`xp-msg ${pinned ? "is-pinned" : ""}`}>
      <span className={`xp-msg-author ${isSystem ? "is-system" : ""}`}>{name}</span>
      {showTag && tag && <span className="xp-msg-tag">#{tag}</span>}
      <span className="xp-msg-time">{formatTimeAgo(post.created_at)}</span>
      {pinned && <span className="xp-msg-pin">📌</span>}
      <ChatBody post={post} />
    </div>
  );
}

/** Renders a message body by kind. Add a branch here for new rich kinds (POLL, QUIZ, …). */
function ChatBody({ post }: { post: FeedPost }) {
  switch (post.kind) {
    case "LINK": {
      const d = (post.data ?? {}) as Record<string, unknown>;
      const siteName = typeof d.site_name === "string" ? d.site_name : undefined;
      const favicon = typeof d.favicon_url === "string" ? d.favicon_url : undefined;
      let host = "";
      try {
        host = post.url ? new URL(post.url).host.replace(/^www\./, "") : "";
      } catch {
        host = "";
      }
      const pending = post.scrape_status === "PENDING";
      return (
        <span className="xp-msg-body">
          {post.text && <span className="xp-msg-text">{post.text}</span>}
          <a className="xp-linkcard" href={post.url} target="_blank" rel="noopener noreferrer">
            {post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image_url} alt="" className="xp-linkcard-img" />
            )}
            <span className="xp-linkcard-body">
              <span className="xp-linkcard-site">
                {favicon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favicon} alt="" className="xp-linkcard-favicon" />
                )}
                {siteName ?? host}
              </span>
              <span className="xp-linkcard-title">
                {post.title ?? (pending ? "Loading preview…" : post.url)}
              </span>
            </span>
          </a>
        </span>
      );
    }
    case "MEDIA":
      return (
        <span className="xp-msg-body">
          {post.text && <span className="xp-msg-text">{post.text}</span>}
          {post.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="xp-msg-media" />
          )}
        </span>
      );
    case "ISSUE_REF":
      return <IssueRefCard issueId={post.issue_id} fallbackText={post.text} />;
    case "EVENT_REF":
      return (
        <span className="xp-msg-body">
          <span className="xp-msg-ref">📅 {post.text ?? "Upcoming event"}</span>
        </span>
      );
    // POLL / QUIZ and richer cards plug in here in a later phase.
    default:
      return (
        <span className="xp-msg-body">
          <span className="xp-msg-text">{post.text}</span>
        </span>
      );
  }
}
