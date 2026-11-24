"use client";

// Quiz automation: generate AI quizzes, review them, watch the queue, and see rejections.
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "generate" | "pending" | "queued" | "rejected";

/** Queued-count at or above this is healthy (green); 1 up to it is low (amber); 0 is empty (red). */
const QUEUE_HEALTHY_AT = 7;

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

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Colour-coded count: red when empty, amber when low, green when healthy. */
function QueueChip({ count, label }: { count: number; label?: string }) {
  const tone =
    count === 0
      ? "bg-red-900/40 text-red-400 border-red-800"
      : count < QUEUE_HEALTHY_AT
        ? "bg-amber-900/40 text-amber-400 border-amber-800"
        : "bg-emerald-900/40 text-emerald-400 border-emerald-800";
  return (
    <span className={`text-xs font-medium tabular-nums px-2 py-px rounded-md border whitespace-nowrap ${tone}`}>
      {label ? `${label}: ` : ""}
      {count}
    </span>
  );
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
    <div className={`px-4 py-6 max-w-7xl mx-auto ${tab === "pending" && pending.length > 0 ? "pb-28" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-zinc-200 mr-auto">Quiz generation</h1>
      </div>

      {/* overflow-y-hidden: the tabs' -mb-px underline overlaps the border by 1px, which would
          otherwise show a tiny vertical scrollbar (overflow-x-auto makes overflow-y auto too). */}
      <div role="tablist" className="flex gap-1 mb-5 border-b border-zinc-800 overflow-x-auto overflow-y-hidden">
        {(
          [
            ["generate", "Generate"],
            ["pending", "Pending"],
            ["queued", "Queued"],
            ["rejected", "Rejected"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition whitespace-nowrap ${
              tab === key ? "border-emerald-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {label}
            {key === "pending" && (
              <span className="ml-1 rounded-full bg-emerald-900/40 px-2 text-xs tabular-nums text-emerald-400">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "generate" && <GenerateTab onGenerated={loadPending} />}
      {tab === "pending" && <PendingTab pending={pending} loading={loadingPending} onChanged={loadPending} />}
      {tab === "queued" && <QueuedTab />}
      {tab === "rejected" && <RejectedTab />}
    </div>
  );
}

/* ───────────── Generate ───────────── */

function GenerateTab({ onGenerated }: { onGenerated: () => void | Promise<void> }) {
  const [localities, setLocalities] = useState<AdminLocalityOption[]>([]);
  const [queued, setQueued] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ kind: "run" | "fail"; text: string }[]>([]);

  const loadQueued = useCallback(() => {
    return adminFetch(ADMIN_API.queuedCounts)
      .then((res) => readData<QueuedCount[]>(res))
      .then((rows) => setQueued(Object.fromEntries(rows.map((r) => [r.hashtag, r.queued]))))
      .catch((e) => toast.error(errorText(e, "Could not load queue counts")));
  }, []);

  useEffect(() => {
    adminFetch(ADMIN_API.quizLocalities)
      .then((res) => readData<AdminLocalityOption[]>(res))
      .then(setLocalities)
      .catch((e) => toast.error(errorText(e, "Could not load hashtags")));
    loadQueued();
  }, [loadQueued]);

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
    const targets = localities.filter((l) => selected.has(l.hashtag)).map((l) => l.hashtag);
    setRunning(true);
    let done = 0;
    let created = 0;
    const failed: string[] = [];
    setStatus([{ kind: "run", text: `Generating… 0 of ${targets.length} done` }]);
    try {
      for (const tag of targets) {
        try {
          const made = await readData<unknown[]>(
            await adminFetch(ADMIN_API.generateQuizzes(tag), { method: "POST" }),
          );
          created += made.length;
          if (made.length === 0) failed.push(tag);
        } catch {
          failed.push(tag);
        }
        done++;
        setStatus([{ kind: "run", text: `Generating… ${done} of ${targets.length} done` }]);
        await onGenerated();
      }
      const lines: { kind: "run" | "fail"; text: string }[] = [
        { kind: "run", text: `Done. ${plural(created, "quiz", "quizzes")} added to Pending.` },
      ];
      if (failed.length > 0) lines.push({ kind: "fail", text: `No quiz generated for ${failed.join(", ")}.` });
      setStatus(lines);
      if (created > 0) toast.success(`${plural(created, "quiz", "quizzes")} ready for review`);
      await loadQueued();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Select hashtags</h2>
        <button
          type="button"
          className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
          onClick={() => setSelected(allSelected ? new Set() : new Set(localities.map((l) => l.hashtag)))}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <div>
        {localities.map((l) => (
          <label
            key={l.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-b-0 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(l.hashtag)}
              onChange={() => toggle(l.hashtag)}
              disabled={running}
              className="w-[18px] h-[18px] accent-emerald-600"
            />
            <span className="font-semibold text-zinc-100 flex-1 min-w-0 truncate">{l.hashtag}</span>
            <QueueChip count={queued[l.hashtag] ?? 0} label="Queued" />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-t border-zinc-800">
        <span className="text-sm text-zinc-400">
          {plural(selected.size, "hashtag", "hashtags")} selected · 1 quiz each
        </span>
        <Button
          onClick={generate}
          disabled={running || selected.size === 0}
          className="bg-emerald-700 hover:bg-emerald-600 text-white h-8 text-sm disabled:opacity-40"
        >
          {running && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          Generate quizzes
        </Button>
      </div>

      {status.length > 0 && (
        <div className="px-4 pb-3.5 grid gap-1.5">
          {status.map((s, i) => (
            <p
              key={i}
              className={`text-sm rounded-lg px-3 py-2 ${
                s.kind === "fail" ? "bg-red-900/40 text-red-400" : "bg-emerald-900/40 text-emerald-400"
              }`}
            >
              {s.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Pending (approve all, reject with reason) ───────────── */

function PendingTab({
  pending,
  loading,
  onChanged,
}: {
  pending: QuizReviewItem[];
  loading: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState<QuizReviewItem | null>(null);
  // Quizzes whose rejection is in flight: the backend writes the replacement before it responds.
  const [regenerating, setRegenerating] = useState<Map<number, string>>(new Map());

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
      toast.success(`${plural(approved.length, "quiz", "quizzes")} moved to Queued`);
      setConfirmingApprove(false);
      await onChanged();
    } catch (e) {
      toast.error(errorText(e, "Approve failed"));
    } finally {
      setApproving(false);
    }
  }

  async function reject(quiz: QuizReviewItem, reason: QuizRejectReason, note: string) {
    setRejecting(null);
    setRegenerating((prev) => new Map(prev).set(quiz.id, quiz.hashtag));
    toast.success("Rejected. Generating a new quiz…");
    try {
      await readData<unknown>(
        await adminFetch(ADMIN_API.rejectQuiz(quiz.id), {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ reason, note: note.trim() || null }),
        }),
      );
      await onChanged();
    } catch (e) {
      toast.error(errorText(e, "Reject failed"));
    } finally {
      setRegenerating((prev) => {
        const next = new Map(prev);
        next.delete(quiz.id);
        return next;
      });
    }
  }

  if (loading && pending.length === 0) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-zinc-400">
        No quizzes waiting for review. Go to Generate to create some.
      </div>
    );
  }

  const readyCount = pending.filter((q) => !regenerating.has(q.id)).length;
  const byTag = pending.reduce<Record<string, number>>((acc, q) => {
    acc[q.hashtag] = (acc[q.hashtag] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="grid gap-4">
        {pending.map((q) =>
          regenerating.has(q.id) ? (
            <div key={q.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2.5 text-sm text-emerald-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating a new quiz for {regenerating.get(q.id)}…
              </div>
            </div>
          ) : (
            <article key={q.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 grid gap-3">
              <b className="text-sm text-emerald-500">{q.hashtag}</b>
              <h3 className="text-base font-semibold text-zinc-100 [text-wrap:balance]">{q.question}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {q.options.map((o, i) => {
                  const correct = i + 1 === q.answer_option_index;
                  return (
                    <li
                      key={i}
                      className={`flex justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                        correct
                          ? "border-emerald-500 bg-emerald-900/40 text-emerald-400 font-semibold"
                          : "border-zinc-800 text-zinc-300"
                      }`}
                    >
                      <span>{o}</span>
                      {correct && <span className="whitespace-nowrap">✓ Answer</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <p className="text-sm text-zinc-400 pl-3 border-l-2 border-zinc-800">{q.explanation}</p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejecting(q)}
                  className="border-red-800 bg-transparent text-red-400 hover:bg-red-900/40 hover:text-red-400"
                >
                  Reject
                </Button>
              </div>
            </article>
          ),
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-zinc-400">{plural(readyCount, "quiz", "quizzes")} pending review</span>
          <Button
            size="sm"
            disabled={readyCount === 0 || regenerating.size > 0}
            onClick={() => setConfirmingApprove(true)}
            className="bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
          >
            Approve all ({readyCount})
          </Button>
        </div>
      </div>

      {confirmingApprove && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 grid gap-3.5">
            <h2 className="text-lg font-semibold text-zinc-100">
              Approve {plural(pending.length, "quiz", "quizzes")}?
            </h2>
            <p className="text-sm text-zinc-400">
              These quizzes move to the queue. One is published per hashtag each day.
            </p>
            <ul className="grid gap-1 text-sm text-zinc-200">
              {Object.entries(byTag).map(([tag, n]) => (
                <li key={tag} className="flex justify-between">
                  <span>{tag}</span>
                  <span>{plural(n, "quiz", "quizzes")}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-zinc-300" onClick={() => setConfirmingApprove(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onClick={approveAll}
                className="bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
              >
                {approving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Approve all
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <RejectDialog
          quiz={rejecting}
          onClose={() => setRejecting(null)}
          onSubmit={(reason, note) => reject(rejecting, reason, note)}
        />
      )}
    </div>
  );
}

function RejectDialog({
  quiz,
  onClose,
  onSubmit,
}: {
  quiz: QuizReviewItem;
  onClose: () => void;
  onSubmit: (reason: QuizRejectReason, note: string) => void;
}) {
  const [reason, setReason] = useState<QuizRejectReason | "">("");
  const [note, setNote] = useState("");

  const needsNote = reason === "OTHER";
  const canSubmit = reason !== "" && (!needsNote || note.trim() !== "");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Reject quiz</h2>
        <p className="text-sm text-zinc-400 mb-4">{quiz.question}</p>

        <label className="text-sm font-semibold text-zinc-200 block mb-1" htmlFor="reject-reason">
          Reason
        </label>
        <select
          id="reject-reason"
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

        <label className="text-sm font-semibold text-zinc-200 block mb-1" htmlFor="reject-note">
          Note{" "}
          <span className="font-normal text-zinc-400">{needsNote ? "(required for Other)" : "(optional)"}</span>
        </label>
        <textarea
          id="reject-note"
          rows={3}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain what is wrong with this quiz"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 mb-2"
        />
        <p className="text-sm text-zinc-400 mb-4">
          A new quiz will be generated for {quiz.hashtag} automatically.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-300" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => reason && onSubmit(reason, note)}
            className="bg-red-800 hover:bg-red-700 text-white disabled:opacity-40"
          >
            Reject quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Queued ───────────── */

function QueuedTab() {
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Queued quizzes</h2>
        <span className="text-sm text-zinc-400">One is published per hashtag each day at 8 AM</span>
      </div>
      {loading ? (
        <p className="px-4 py-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Hashtag</th>
                <th className="px-4 py-2.5 font-medium">Queued</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.locality_id} className="border-t border-zinc-800">
                  <td className="px-4 py-2.5 text-zinc-100 font-semibold">{r.hashtag}</td>
                  <td className="px-4 py-2.5">
                    <QueueChip count={r.queued} />
                  </td>
                </tr>
              ))}
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Rejected quizzes</h2>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {loading ? (
        <p className="px-4 py-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Hashtag</th>
                <th className="px-4 py-2.5 font-medium">Question</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-zinc-400">
                    No rejected quizzes match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-800 align-top">
                    <td className="px-4 py-2.5 text-zinc-100 font-semibold">{r.hashtag}</td>
                    <td className="px-4 py-2.5 text-zinc-200">{r.question}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium px-2 py-px rounded-md border bg-red-900/40 text-red-400 border-red-800 whitespace-nowrap">
                        {reasonLabel(r.rejection_reason)}
                      </span>
                      {r.rejection_note && <p className="text-sm text-zinc-400 mt-1">{r.rejection_note}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">
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
