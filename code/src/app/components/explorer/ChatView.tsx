"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useFeed } from "../feed/useFeed";
import { FeedComposer } from "../feed/FeedComposer";
import type { FeedPost } from "../../models/feed";
import { formatTimeAgo } from "./layerConfig";

/**
 * Twitch-style chat for the home "Chat" tab: a scrolling message stream with a compose box pinned
 * to the bottom. Reads the aggregated #india feed (national admin posts + all child localities').
 * Not a map layer — this replaces the map content while the Chat tab is active.
 */
export default function ChatView() {
  const { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload } =
    useFeed("india", { aggregate: true });

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement | null>(null);

  // Older messages load when the user scrolls to the top (chat grows upward).
  useEffect(() => {
    const el = topSentinel.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: scrollRef.current, rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, posts.length]);

  // Render newest-at-bottom (chat convention): reverse the newest-first API order.
  const ordered = [...posts].reverse();

  return (
    <div className="xp-chat">
      <div className="xp-chat-header">
        <span className="xp-chat-title">#india · Community chat</span>
        <span className="xp-chat-sub">All localities + national updates</span>
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
              <ChatMessage key={`pin-${p.id}`} post={p} pinned />
            ))}
            {ordered.length === 0 && pinned.length === 0 ? (
              <div className="xp-chat-empty">
                No messages yet. Be the first to say something.
              </div>
            ) : (
              ordered.map((p) => <ChatMessage key={p.id} post={p} />)
            )}
          </>
        )}
      </div>

      <div className="xp-chat-compose">
        <FeedComposer onPosted={reload} />
      </div>
    </div>
  );
}

function ChatMessage({ post, pinned }: { post: FeedPost; pinned?: boolean }) {
  const isSystem = !post.author;
  const name = isSystem ? "📣 #local" : post.author?.username ?? "Member";
  const tag = post.hashtag?.replace(/^#/, "");

  return (
    <div className={`xp-chat-msg ${pinned ? "is-pinned" : ""}`}>
      <div className="xp-chat-msg-head">
        <span className="xp-chat-author">{name}</span>
        {tag && <span className="xp-chat-tag">#{tag}</span>}
        <span className="xp-chat-time">{formatTimeAgo(post.created_at)}</span>
        {pinned && <span className="xp-chat-pin">📌</span>}
      </div>
      <ChatBody post={post} />
    </div>
  );
}

function ChatBody({ post }: { post: FeedPost }) {
  if (post.kind === "LINK") {
    return (
      <div className="xp-chat-body">
        {post.text && <p className="xp-chat-text">{post.text}</p>}
        <a
          className="xp-chat-link"
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt={post.title ?? "link"} className="xp-chat-link-img" />
          )}
          <span className="xp-chat-link-title">
            {post.title ?? (post.scrape_status === "PENDING" ? "Loading preview…" : post.url)}
          </span>
        </a>
      </div>
    );
  }
  if (post.kind === "MEDIA" && post.media_url) {
    return (
      <div className="xp-chat-body">
        {post.text && <p className="xp-chat-text">{post.text}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.media_url} alt="attachment" className="xp-chat-media" />
      </div>
    );
  }
  if (post.kind === "ISSUE_REF" || post.kind === "EVENT_REF") {
    const label = post.kind === "ISSUE_REF" ? "Issue reported" : "Upcoming event";
    return (
      <div className="xp-chat-body">
        <span className="xp-chat-ref">
          {post.kind === "ISSUE_REF" ? "⚠️" : "📅"} {post.text ?? label}
        </span>
      </div>
    );
  }
  return (
    <div className="xp-chat-body">
      <p className="xp-chat-text">{post.text}</p>
    </div>
  );
}
