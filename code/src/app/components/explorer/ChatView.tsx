"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useFeed } from "../feed/useFeed";
import { useProfile } from "../feed/useProfile";
import { FeedComposer } from "../feed/FeedComposer";
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
export default function ChatView({ hashtag }: { hashtag: string }) {
  // The root channel aggregates children; specific localities show just their own feed.
  const isRoot = hashtag.replace(/^#/, "").toLowerCase() === "india";
  const { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload } = useFeed(
    hashtag,
    { aggregate: isRoot },
  );
  const { isAdmin } = useProfile();

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement | null>(null);

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

  // Newest-at-bottom (chat convention): reverse the newest-first API order.
  const ordered = [...posts].reverse();
  const label = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;

  return (
    <div className="xp-chat">
      <div className="xp-chat-header">
        <span className="xp-chat-title">{label}</span>
        <span className="xp-chat-sub">
          {isRoot ? "All localities + national updates" : "Locality chat"}
        </span>
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
    case "LINK":
      return (
        <span className="xp-msg-body">
          {post.text && <span className="xp-msg-text">{post.text} </span>}
          <a className="xp-msg-link" href={post.url} target="_blank" rel="noopener noreferrer">
            {post.title ?? (post.scrape_status === "PENDING" ? "link…" : post.url)}
          </a>
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="xp-msg-thumb" />
          )}
        </span>
      );
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
    case "EVENT_REF":
      return (
        <span className="xp-msg-body">
          <span className="xp-msg-ref">
            {post.kind === "ISSUE_REF" ? "⚠️" : "📅"}{" "}
            {post.text ?? (post.kind === "ISSUE_REF" ? "Issue reported" : "Upcoming event")}
          </span>
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
