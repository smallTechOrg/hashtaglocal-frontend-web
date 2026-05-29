"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useFeed } from "../components/feed/useFeed";
import { FeedPostCard } from "../components/feed/FeedPostCard";
import { FeedComposer } from "../components/feed/FeedComposer";

export default function FeedClient() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("hashtag") ?? "";
  const hashtag = raw.replace(/^#/, "").trim();

  const { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload } =
    useFeed(hashtag || null);

  // Infinite scroll: load more when the sentinel enters the viewport.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, posts.length]);

  if (!hashtag) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-zinc-500">
        Pick a hashtag to view its feed, e.g. <code>/feed?hashtag=tnagar</code>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-32 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900">#{hashtag}</h1>
        <p className="text-sm text-zinc-500">Neighbourhood feed</p>
      </header>

      <div className="mb-4">
        <FeedComposer onPosted={reload} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Could not load this feed. {error}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <div className="flex flex-col gap-4 rounded-xl bg-emerald-50/50 p-3">
              {pinned.map((p) => (
                <FeedPostCard key={`pin-${p.id}`} post={p} />
              ))}
            </div>
          )}

          {posts.length === 0 && pinned.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              No posts yet. Be the first to share something.
            </div>
          ) : (
            posts.map((p) => <FeedPostCard key={p.id} post={p} />)
          )}

          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="flex justify-center py-4 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
