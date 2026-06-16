"use client";

import { useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? body?.message ?? `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

export default function NotificationPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (!window.confirm("Send this notification to every user with the app installed?")) return;

    setSending(true);
    try {
      const res = await adminFetch(ADMIN_API.notification, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification: { type: "BROADCAST", payload: { title, body } },
        }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const json = await res.json();
      const delivered = json.data?.notification_delivered ?? 0;
      toast.success(`Sent to ${delivered} device${delivered === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error(`Failed to send broadcast: ${err}`);
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
