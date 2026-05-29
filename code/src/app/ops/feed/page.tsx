"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "../lib/api";
import { API_PATHS } from "../../constants/api";
import type {
  ModerationQueueItem,
  ModerationQueueResponse,
} from "../../models/feed";

/** Top-level tabs. REVIEW = items needing a decision; ARCHIVE = all posts, every status. */
type Tab = "REVIEW" | "ARCHIVE";

/** Backend `verdict` filter values. */
type Verdict = "REVIEW" | "BLOCKED" | "FLAGGED" | "ALL" | "PUBLISHED" | "HIDDEN";

const ARCHIVE_FILTERS: { value: Verdict; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "BLOCKED", label: "AI-blocked" },
  { value: "FLAGGED", label: "Flagged" },
];

export default function OpsFeedModerationPage() {
  const [tab, setTab] = useState<Tab>("REVIEW");
  const [archiveFilter, setArchiveFilter] = useState<Verdict>("ALL");

  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // The verdict sent to the backend depends on the active tab.
  const verdict: Verdict = tab === "REVIEW" ? "REVIEW" : archiveFilter;

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const res = await adminFetch(
        API_PATHS.feedModerationQueue(verdict, cursor ?? undefined),
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json: ModerationQueueResponse = await res.json();
      const data = json.data ?? {};
      setNextCursor(data.next_cursor ?? null);
      setItems((prev) =>
        append ? [...prev, ...(data.items ?? [])] : data.items ?? [],
      );
    },
    [verdict],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setNextCursor(null);
    try {
      await fetchPage(null, false);
    } catch (err) {
      toast.error(`Failed to load: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(nextCursor, true);
    } catch (err) {
      toast.error(`Failed to load more: ${err}`);
    } finally {
      setLoadingMore(false);
    }
  }

  async function act(item: ModerationQueueItem, action: "approve" | "hide") {
    const id = item.post.id;
    setBusyId(id);
    try {
      const url =
        action === "approve" ? API_PATHS.feedApprove(id) : API_PATHS.feedHide(id);
      const res = await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: action === "hide" ? "Hidden by admin" : "Approved by admin",
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(action === "approve" ? "Post published" : "Post hidden");
      // In the Review tab the item leaves the queue; in Archive it stays but its
      // status changes, so a reload keeps the displayed status accurate.
      if (tab === "REVIEW") {
        setItems((prev) => prev.filter((i) => i.post.id !== id));
      } else {
        load();
      }
    } catch (err) {
      toast.error(`Action failed: ${err}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Feed moderation</h1>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-800">
        {(["REVIEW", "ARCHIVE"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t
                ? "border-emerald-500 text-white"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t === "REVIEW" ? "Review queue" : "Archive"}
          </button>
        ))}
      </div>

      {/* Archive sub-filters */}
      {tab === "ARCHIVE" && (
        <div className="mb-4 flex flex-wrap gap-1">
          {ARCHIVE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setArchiveFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                archiveFilter === f.value
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          {tab === "REVIEW" ? "Nothing to review. 🎉" : "No posts."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ModerationCard
              key={item.post.id}
              item={item}
              busy={busyId === item.post.id}
              onApprove={() => act(item, "approve")}
              onHide={() => act(item, "hide")}
            />
          ))}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 flex items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-900/50 text-emerald-300",
  PENDING_AI: "bg-blue-900/50 text-blue-300",
  FLAGGED: "bg-amber-900/50 text-amber-300",
  AI_BLOCKED: "bg-red-900/50 text-red-300",
  ADMIN_HIDDEN: "bg-zinc-700 text-zinc-300",
};

function ModerationCard({
  item,
  busy,
  onApprove,
  onHide,
}: {
  item: ModerationQueueItem;
  busy: boolean;
  onApprove: () => void;
  onHide: () => void;
}) {
  const { post } = item;
  const isPublished = post.status === "PUBLISHED";
  const isHidden = post.status === "ADMIN_HIDDEN";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{post.kind}</span>
        {post.hashtag && <span className="text-emerald-400">#{post.hashtag.replace(/^#/, "")}</span>}
        <span className="text-zinc-500">by {post.author?.username ?? "system"}</span>
        <span
          className={`rounded px-2 py-0.5 ${STATUS_STYLES[post.status] ?? "bg-zinc-800 text-zinc-300"}`}
        >
          {post.status}
        </span>
        {item.ai_verdict && (
          <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
            AI: {item.ai_verdict}
            {item.ai_category && item.ai_category !== "NONE" ? ` · ${item.ai_category}` : ""}
          </span>
        )}
      </div>

      {post.text && (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{post.text}</p>
      )}
      {post.url && (
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-blue-400 hover:underline"
        >
          {post.url}
        </a>
      )}
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media_url} alt="attachment" className="mt-2 max-h-48 rounded object-cover" />
      )}

      {item.ai_reason && (
        <p className="mt-2 rounded bg-zinc-800/60 p-2 text-xs italic text-zinc-400">
          {item.ai_reason}
          {typeof item.ai_confidence === "number"
            ? ` (confidence ${(item.ai_confidence * 100).toFixed(0)}%)`
            : ""}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {!isPublished && (
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isHidden ? "Unhide / publish" : "Approve"}
          </button>
        )}
        {!isHidden && (
          <button
            onClick={onHide}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            <EyeOff className="h-4 w-4" /> Hide
          </button>
        )}
      </div>
    </div>
  );
}
