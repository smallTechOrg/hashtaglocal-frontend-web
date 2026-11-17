"use client";

// Quiz automation: generate AI quizzes, review them, watch queue health, and see rejections.
// Talks to the backend /admin/quiz review API.

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { AdminLocalityOption } from "../lib/types";
import {
  QueuedCount,
  QuizRejectReason,
  QuizReviewItem,
  REJECT_REASONS,
} from "../lib/quizReviewTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Tab = "generate" | "review" | "queue" | "rejected";

const QUEUE_TARGET_DAYS = 30;

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Reads the backend's { data } envelope, or throws with the server's message. */
async function readData<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? body?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function reasonLabel(value: QuizRejectReason | null): string {
  return REJECT_REASONS.find((r) => r.value === value)?.label ?? "";
}

export default function QuizGenerationPage() {
  const [tab, setTab] = useState<Tab>("generate");
  const [pending, setPending] = useState<QuizReviewItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      setPending(await readData<QuizReviewItem[]>(await adminFetch(ADMIN_API.pendingQuizzes)));
    } catch (e) {
      toast.error(errorText(e, "Could not load pending quizzes"));
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-zinc-200 mr-auto">Quiz generation</h1>
      </div>

      <div className="flex gap-1 mb-5 border-b border-zinc-800 overflow-x-auto">
        {(
          [
            ["generate", "Generate"],
            ["review", `Review (${pending.length})`],
            ["queue", "Queue"],
            ["rejected", "Rejected"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition whitespace-nowrap ${
              tab === key ? "border-emerald-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "generate" && (
        <GenerateTab
          onGenerated={async () => {
            await loadPending();
            setTab("review");
          }}
        />
      )}
      {tab === "review" && (
        <ReviewTab pending={pending} loading={loadingPending} onChanged={loadPending} />
      )}
      {tab === "queue" && <QueueTab />}
      {tab === "rejected" && <RejectedTab />}
    </div>
  );
}

/* ───────────── Generate ───────────── */

function GenerateTab({ onGenerated }: { onGenerated: () => void | Promise<void> }) {
  const [localities, setLocalities] = useState<AdminLocalityOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(ADMIN_API.quizLocalities)
      .then((res) => readData<AdminLocalityOption[]>(res))
      .then(setLocalities)
      .catch((e) => toast.error(errorText(e, "Could not load hashtags")));
  }, []);

  const allSelected = localities.length > 0 && selected.size === localities.length;

  function toggle(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function generate() {
    // All hashtags selected: one request for everything. Otherwise one request per hashtag.
    const hashtags = allSelected ? [] : localities.filter((l) => selected.has(l.hashtag)).map((l) => l.hashtag);
    const requested = allSelected ? localities.length : hashtags.length;
    const targets: (string | null)[] = allSelected ? [null] : hashtags;

    setRunning(true);
    let created = 0;
    const failed: string[] = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        const tag = targets[i];
        setProgress(tag ? `Generating ${tag} (${i + 1} of ${targets.length})…` : "Generating for all hashtags…");
        try {
          const made = await readData<unknown[]>(
            await adminFetch(ADMIN_API.generateQuizzes(tag), { method: "POST" }),
          );
          created += made.length;
          if (tag && made.length === 0) failed.push(tag);
        } catch (e) {
          if (tag) failed.push(tag);
          else toast.error(errorText(e, "Generation failed"));
        }
      }
      toast.success(`${created} of ${requested} quizzes added to review`);
      if (failed.length > 0) toast.error(`No quiz generated for ${failed.join(", ")}`);
      await onGenerated();
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 max-w-2xl">
      <h2 className="text-sm font-semibold text-zinc-200 mb-1">Generate quizzes</h2>
      <p className="text-xs text-zinc-500 mb-4">
        Claude writes one quiz per selected hashtag. Each quiz goes to Review as Pending. Questions repeat-checked
        against the last 100 days.
      </p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">
          {selected.size} of {localities.length} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 text-xs"
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set(localities.map((l) => l.hashtag)))
          }
        >
          {allSelected ? "Clear all" : "Select all"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {localities.map((l) => (
          <label
            key={l.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${
              selected.has(l.hashtag) ? "border-emerald-700 text-zinc-100" : "border-zinc-800 text-zinc-400"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(l.hashtag)}
              onChange={() => toggle(l.hashtag)}
              className="accent-emerald-600"
            />
            {l.hashtag}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={generate}
          disabled={running || selected.size === 0}
          className="bg-emerald-700 hover:bg-emerald-600 text-white h-8 text-sm disabled:opacity-40"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {running ? "Generating…" : "Generate"}
        </Button>
        {progress && <span className="text-xs text-zinc-400">{progress}</span>}
      </div>
    </div>
  );
}

/* ───────────── Review (approve all, reject with reason) ───────────── */

function ReviewTab({
  pending,
  loading,
  onChanged,
}: {
  pending: QuizReviewItem[];
  loading: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState<QuizReviewItem | null>(null);

  async function approveAll() {
    // Only the quizzes on screen are approved. Anything generated after this list loaded stays pending.
    setApproving(true);
    try {
      const approved = await readData<unknown[]>(
        await adminFetch(ADMIN_API.approveQuizzes, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ quiz_ids: pending.map((q) => q.id) }),
        }),
      );
      toast.success(`${approved.length} quizzes moved to Queued`);
      await onChanged();
    } catch (e) {
      toast.error(errorText(e, "Approve failed"));
    } finally {
      setApproving(false);
    }
  }

  if (loading && pending.length === 0) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-zinc-500">{pending.length} waiting for review</span>
        <Button
          size="sm"
          disabled={pending.length === 0 || approving}
          onClick={approveAll}
          className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
        >
          {approving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
          Approve all ({pending.length})
        </Button>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2">
          <p className="text-zinc-400 font-medium">Nothing waiting for review</p>
          <p className="text-zinc-500 text-sm">Generate a batch from the Generate tab.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((q) => (
            <div key={q.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                  {q.hashtag}
                </Badge>
              </div>
              <p className="text-sm text-zinc-200 font-medium mb-2">{q.question}</p>
              <ul className="space-y-1 mb-2">
                {q.options.map((o, i) => (
                  <li
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      i + 1 === q.answer_option_index ? "bg-emerald-900/30 text-emerald-400" : "text-zinc-400"
                    }`}
                  >
                    {o}
                  </li>
                ))}
              </ul>
              {q.explanation && <p className="text-xs text-zinc-500 mb-3">{q.explanation}</p>}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejecting(q)}
                className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
              >
                <X className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <RejectDialog
          quiz={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={async () => {
            setRejecting(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function RejectDialog({
  quiz,
  onClose,
  onRejected,
}: {
  quiz: QuizReviewItem;
  onClose: () => void;
  onRejected: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState<QuizRejectReason | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const needsNote = reason === "OTHER";
  const canSubmit = reason !== "" && (!needsNote || note.trim() !== "") && !saving;

  async function submit() {
    if (!reason) return;
    setSaving(true);
    try {
      await readData<unknown>(
        await adminFetch(ADMIN_API.rejectQuiz(quiz.id), {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ reason, note: note.trim() || null }),
        }),
      );
      toast.success(`Rejected. A replacement is being generated for ${quiz.hashtag}.`);
      await onRejected();
    } catch (e) {
      toast.error(errorText(e, "Reject failed"));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-zinc-200 mb-1">Reject quiz</h2>
        <p className="text-xs text-zinc-500 mb-4 truncate">{quiz.question}</p>

        <label className="text-xs text-zinc-400 block mb-1">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as QuizRejectReason | "")}
          className="w-full h-8 mb-3 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
        >
          <option value="">Select a reason</option>
          {REJECT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <label className="text-xs text-zinc-400 block mb-1">
          Note {needsNote ? <span className="text-amber-400">(required)</span> : <span>(optional)</span>}
        </label>
        <textarea
          rows={3}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What is wrong with this quiz?"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 mb-4"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-400" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={submit}
            className="bg-red-800 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Reject quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Queue health ───────────── */

function QueueTab() {
  const [rows, setRows] = useState<QueuedCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(ADMIN_API.queuedCounts)
      .then((res) => readData<QueuedCount[]>(res))
      .then(setRows)
      .catch((e) => toast.error(errorText(e, "Could not load queue")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">
        Target: {QUEUE_TARGET_DAYS} queued quizzes per hashtag. An empty queue means no quiz in that day&apos;s
        bulletin.
      </p>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hashtag</th>
                <th className="px-4 py-3">Queued</th>
                <th className="px-4 py-3 w-64">Days of cover</th>
                <th className="px-4 py-3">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => {
                const pct = Math.min(100, Math.round((r.queued / QUEUE_TARGET_DAYS) * 100));
                const empty = r.queued === 0;
                const low = r.queued < 10;
                return (
                  <tr key={r.locality_id} className="bg-zinc-950">
                    <td className="px-4 py-3 text-zinc-200 font-medium">{r.hashtag}</td>
                    <td className="px-4 py-3 text-zinc-200">{r.queued}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${empty || low ? "bg-red-500" : pct < 100 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {empty ? (
                        <Badge className="text-xs bg-red-900/40 text-red-400 border border-red-800 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Empty
                        </Badge>
                      ) : low ? (
                        <Badge className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Low
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800">
                          Healthy
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────────── Rejected history (reason filter) ───────────── */

function RejectedTab() {
  const [localities, setLocalities] = useState<AdminLocalityOption[]>([]);
  const [hashtag, setHashtag] = useState("");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<QuizReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(ADMIN_API.quizLocalities)
      .then((res) => readData<AdminLocalityOption[]>(res))
      .then(setLocalities)
      .catch((e) => toast.error(errorText(e, "Could not load hashtags")));
  }, []);

  useEffect(() => {
    setLoading(true);
    adminFetch(ADMIN_API.rejectedQuizzes(hashtag || null, reason || null))
      .then((res) => readData<QuizReviewItem[]>(res))
      .then(setRows)
      .catch((e) => toast.error(errorText(e, "Could not load rejected quizzes")))
      .finally(() => setLoading(false));
  }, [hashtag, reason]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={hashtag}
          onChange={(e) => setHashtag(e.target.value)}
          aria-label="Filter by hashtag"
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
        >
          <option value="">All hashtags</option>
          {localities.map((l) => (
            <option key={l.id} value={l.hashtag}>
              {l.hashtag}
            </option>
          ))}
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Filter by reason"
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
        >
          <option value="">All reasons</option>
          {REJECT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hashtag</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Reviewed by</th>
                <th className="px-4 py-3">Reviewed at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No rejected quizzes match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-zinc-950 align-top">
                    <td className="px-4 py-3 text-zinc-200 font-medium">{r.hashtag}</td>
                    <td className="px-4 py-3 text-zinc-300">{r.question}</td>
                    <td className="px-4 py-3">
                      <Badge className="text-xs bg-red-900/40 text-red-400 border border-red-800">
                        {reasonLabel(r.rejection_reason)}
                      </Badge>
                      {r.rejection_note && <p className="text-xs text-zinc-500 mt-1">{r.rejection_note}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{r.reviewed_by ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {r.reviewed_at ? r.reviewed_at.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
