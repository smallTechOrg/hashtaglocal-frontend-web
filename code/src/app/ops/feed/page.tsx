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

type Filter = "ALL" | "BLOCKED" | "FLAGGED";

export default function OpsFeedModerationPage() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(
        API_PATHS.feedModerationQueue(filter === "ALL" ? undefined : filter),
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json: ModerationQueueResponse = await res.json();
      setItems(json.data?.items ?? []);
    } catch (err) {
      toast.error(`Failed to load moderation queue: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(item: ModerationQueueItem, action: "approve" | "hide") {
    const id = item.post.id;
    setBusyId(id);
    try {
      const url = action === "approve" ? API_PATHS.feedApprove(id) : API_PATHS.feedHide(id);
      const res = await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: action === "hide" ? "Hidden by admin" : "Approved by admin" }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(action === "approve" ? "Post published" : "Post hidden");
      setItems((prev) => prev.filter((i) => i.post.id !== id));
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

      <div className="mb-4 flex gap-1">
        {(["ALL", "BLOCKED", "FLAGGED"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              filter === f
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
            }`}
          >
            {f === "ALL" ? "All" : f === "BLOCKED" ? "AI-blocked" : "Flagged"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Nothing to review. 🎉
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
        </div>
      )}
    </div>
  );
}

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
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{post.kind}</span>
        {post.hashtag && <span className="text-emerald-400">#{post.hashtag}</span>}
        <span className="text-zinc-500">by {post.author?.username ?? "system"}</span>
        {item.ai_verdict && (
          <span
            className={`ml-auto rounded px-2 py-0.5 ${
              item.ai_verdict === "BLOCK"
                ? "bg-red-900/50 text-red-300"
                : "bg-amber-900/50 text-amber-300"
            }`}
          >
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
        <button
          onClick={onApprove}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </button>
        <button
          onClick={onHide}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          <EyeOff className="h-4 w-4" /> Hide
        </button>
      </div>
    </div>
  );
}
