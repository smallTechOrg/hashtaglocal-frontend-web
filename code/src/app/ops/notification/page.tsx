"use client";

import { useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type NotificationType = "BROADCAST" | "CHAT" | "ISSUE_DETAIL";

const TYPE_LABELS: Record<NotificationType, string> = {
  BROADCAST: "Broadcast",
  CHAT: "Chat",
  ISSUE_DETAIL: "Issue Detail",
};

const TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  BROADCAST: "Opens the map screen on tap.",
  CHAT: "Opens the community chat screen on tap.",
  ISSUE_DETAIL: "Opens a specific issue detail page on tap.",
};

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? body?.message ?? `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

export default function NotificationPage() {
  const [type, setType] = useState<NotificationType>("BROADCAST");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [issueId, setIssueId] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (type === "ISSUE_DETAIL" && !issueId.trim()) return;

    const confirmMsg =
      type === "ISSUE_DETAIL"
        ? `Send issue #${issueId} notification to every user?`
        : "Send this notification to every user with the app installed?";
    if (!window.confirm(confirmMsg)) return;

    const payload: Record<string, string> = { title, body };
    if (type === "ISSUE_DETAIL") payload.issue_id = issueId.trim();

    setSending(true);
    try {
      const res = await adminFetch(ADMIN_API.notification, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification: { type, payload } }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const json = await res.json();
      const delivered = json.data?.notification_delivered ?? 0;
      toast.success(`Sent to ${delivered} device${delivered === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      setIssueId("");
    } catch (err) {
      toast.error(`Failed to send notification: ${err}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-zinc-200">Notification</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Sends a push notification to every user with an active device token.
        </p>
      </div>

      <form
        onSubmit={handleSend}
        className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-xl p-5"
      >
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Type *</label>
          <div className="flex gap-2">
            {(Object.keys(TYPE_LABELS) as NotificationType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  type === t
                    ? "bg-emerald-700 border-emerald-600 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">{TYPE_DESCRIPTIONS[type]}</p>
        </div>

        {type === "ISSUE_DETAIL" && (
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Issue ID *</label>
            <Input
              required
              type="number"
              min="1"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              placeholder="e.g. 42"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New feature: City Bulletins"
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Message *</label>
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to tell every user?"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={sending}
            className="bg-emerald-700 hover:bg-emerald-600 text-white"
          >
            {sending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Send className="w-3 h-3 mr-1" />
            )}
            Send to Everyone
          </Button>
        </div>
      </form>
    </div>
  );
}
