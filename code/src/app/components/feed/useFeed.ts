"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_PATHS } from "../../constants/api";
import { getAccessToken } from "../../ops/lib/auth";
import type { FeedListResponse, FeedPost } from "../../models/feed";

interface UseFeedResult {
  pinned: FeedPost[];
  posts: FeedPost[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

const PAGE_SIZE = 30;

/**
 * Loads a hashtag's feed timeline with keyset pagination. Reads are public; if the viewer happens
 * to be logged in we attach the token so the backend can fill viewer_context.
 */
interface UseFeedOptions {
  /** When true, the backend aggregates this (root) hashtag's feed with all its children. */
  aggregate?: boolean;
}

export function useFeed(
  hashtag: string | null,
  options: UseFeedOptions = {},
): UseFeedResult {
  const { aggregate = false } = options;
  const [pinned, setPinned] = useState<FeedPost[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const authHeader = useCallback((): HeadersInit => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean, signal?: AbortSignal) => {
      const url =
        API_PATHS.feedTimeline(hashtag as string, cursor ?? undefined, PAGE_SIZE) +
        (aggregate ? "&aggregate=true" : "");
      const res = await fetch(url, { cache: "no-store", headers: authHeader(), signal });
      if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
      const body: FeedListResponse = await res.json();
      const data = body.data ?? {};
      cursorRef.current = data.next_cursor ?? null;
      setHasMore(Boolean(data.next_cursor));
      if (append) {
        setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      } else {
        setPinned(data.pinned ?? []);
        setPosts(data.posts ?? []);
      }
    },
    [hashtag, aggregate, authHeader],
  );

  const reload = useCallback(() => {
    if (!hashtag) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    cursorRef.current = null;
    fetchPage(null, false, controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hashtag, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hashtag || loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    fetchPage(cursorRef.current, true)
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingMore(false));
  }, [hashtag, loadingMore, fetchPage]);

  useEffect(() => {
    if (!hashtag) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    cursorRef.current = null;
    fetchPage(null, false, controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hashtag, fetchPage]);

  return { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload };
}
