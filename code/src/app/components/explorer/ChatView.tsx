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
  // While true, the stream auto-pins to the bottom through every async layout shift (images
  // loading after first paint, panel resize). It starts true and only flips off when the user
  // deliberately scrolls up — so initial load stays glued to the newest message even as images
  // below the fold load and grow the height (the old isNearBottom() check failed here, because
  // each late-loading image pushed the real bottom out of the 120px window).
  const stickToBottomRef = useRef(true);
  // Last observed scrollTop, used to tell a real upward scroll from layout-induced scroll events.
  const lastScrollTopRef = useRef(0);

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll the container itself to its full height. Relying on a zero-height anchor's
    // scrollIntoView left the stream a hair short of the bottom (flex gap + sub-pixel rounding).
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

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
    stickToBottomRef.current = true;
    lastScrollTopRef.current = 0;
  }, [hashtag]);

  // Track the user's scroll *intent*, not raw position. Only a deliberate scroll UP releases the
  // auto-pin; scrolling back to the bottom re-engages it. Critically, we must NOT release on
  // layout-induced scroll events: when content grows (map finishing, images loading) the browser
  // fires a scroll event with the old scrollTop against the new scrollHeight, which makes
  // isNearBottom() momentarily false — that used to flip stick-to-bottom off on initial load and
  // leave the stream stuck mid-way. Comparing against the last scrollTop tells real upward scrolls
  // (scrollTop decreased) apart from growth (scrollTop unchanged, only scrollHeight grew).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const prev = lastScrollTopRef.current;
      lastScrollTopRef.current = el.scrollTop;
      if (el.scrollTop < prev - 1) {
        // User scrolled up — release the pin.
        stickToBottomRef.current = false;
      } else if (isNearBottom()) {
        // Back at the bottom (or never left) — keep/re-engage the pin.
        stickToBottomRef.current = true;
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

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
      // On first load the stream height isn't settled in a single frame (map co-rendering, fonts,
      // late images). Re-pin to the bottom across a short settle window — but only while we're
      // still sticking, so a user who scrolls up immediately isn't yanked back down.
      const pin = () => {
        if (stickToBottomRef.current) scrollToBottom("auto");
      };
      requestAnimationFrame(pin);
      [60, 150, 300, 600].forEach((ms) => window.setTimeout(pin, ms));
      return;
    }
    if (newestId !== null && newestId !== newestSeenRef.current) {
      newestSeenRef.current = newestId;
      scrollToBottom("smooth");
    }
  }, [newestId, loading]);

  // Keep pinned to the bottom through async layout shifts (panel resize, text reflow, content
  // growth) while the user hasn't scrolled up — so reading history isn't interrupted, but the
  // newest message stays glued through reflows.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) scrollToBottom("auto");
    });
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [posts.length, loading]);

  // Images (feed media, link cards, issue-ref thumbnails) load async and grow the stream height
  // AFTER layout — a ResizeObserver alone misses some of these, and on first load each late image
  // pushes the real bottom past the isNearBottom() window. Catch every descendant image's load in
  // the capture phase (load doesn't bubble) and re-pin while we're sticking to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onLoadCapture = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === "IMG" && stickToBottomRef.current) {
        scrollToBottom("auto");
      }
    };
    el.addEventListener("load", onLoadCapture, true);
    return () => el.removeEventListener("load", onLoadCapture, true);
  }, []);

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

  // The backend only ever returns a non-PUBLISHED post to its own author, so any such row in the
  // viewer's stream is their own message awaiting moderation. Show it greyed with an "under review"
  // tag so they know it isn't public yet (others won't see it at all).
  const underReview = post.status !== "PUBLISHED";

  return (
    <div className={`xp-msg ${pinned ? "is-pinned" : ""} ${underReview ? "is-under-review" : ""}`}>
      <span className={`xp-msg-author ${isSystem ? "is-system" : ""}`}>{name}</span>
      {showTag && tag && <span className="xp-msg-tag">#{tag}</span>}
      <span className="xp-msg-time">{formatTimeAgo(post.created_at)}</span>
      {pinned && <span className="xp-msg-pin">📌</span>}
      {underReview && <span className="xp-msg-review">under review</span>}
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
