"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { AdminLocalityOption, AdminQuiz } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import { toast } from "sonner";
import AiPromptBox from "../components/AiPromptBox";

const QUESTION_MAX = 120;
const OPTION_MAX = 60;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  locality_id: "",
  date: todayISO(),
  question: "",
  options: ["", "", "", ""],
  answer_option_index: 1,
  explanation: "",
};

type QuizForm = typeof EMPTY_FORM;

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? body?.message ?? `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [localities, setLocalities] = useState<AdminLocalityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);

  const [filterDate, setFilterDate] = useState<string>(todayISO());

  // create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<AdminQuiz | null>(null);
  const [form, setForm] = useState<QuizForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // index by locality_id for O(1) row lookup
  const quizByLocality = Object.fromEntries(quizzes.map((q) => [q.locality_id, q]));

  const loadQuizzes = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const url = ADMIN_API.quizzes(null, filterDate || null);
        const res = await adminFetch(url, { signal });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setQuizzes(json.data ?? []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(`Failed to load quizzes: ${err}`);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filterDate],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadQuizzes(controller.signal);
    return () => controller.abort();
  }, [loadQuizzes]);

  useEffect(() => {
    (async () => {
      setLocalitiesLoading(true);
      try {
        const res = await adminFetch(ADMIN_API.quizLocalities);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setLocalities(json.data ?? []);
      } catch (err) {
        toast.error(`Failed to load localities: ${err}`);
      } finally {
        setLocalitiesLoading(false);
      }
    })();
  }, []);

  /** Open modal pre-filled for a specific locality (create mode). */
  function openCreate(locality?: AdminLocalityOption) {
    setEditingQuiz(null);
    setForm({
      ...EMPTY_FORM,
      locality_id: locality ? String(locality.id) : "",
      date: filterDate || todayISO(),
    });
    setShowForm(true);
  }

  function openEdit(quiz: AdminQuiz) {
    setEditingQuiz(quiz);
    setForm({
      locality_id: String(quiz.locality_id),
      date: quiz.date ?? todayISO(),
      question: quiz.question,
      options: [...quiz.options],
      answer_option_index: quiz.answer_option_index,
      explanation: quiz.explanation ?? "",
    });
    setShowForm(true);
  }

  function setOption(index: number, value: string) {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = editingQuiz
        ? await adminFetch(ADMIN_API.editQuiz(editingQuiz.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: form.question,
              options: form.options,
              answer_option_index: form.answer_option_index,
              explanation: form.explanation || null,
            }),
          })
        : await adminFetch(ADMIN_API.createQuiz, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locality_id: Number(form.locality_id),
              date: form.date,
              question: form.question,
              options: form.options,
              answer_option_index: form.answer_option_index,
              explanation: form.explanation || null,
            }),
          });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success(editingQuiz ? "Quiz updated" : "Quiz created");
      setShowForm(false);
      loadQuizzes();
    } catch (err) {
      toast.error(`Failed to save quiz: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!editingQuiz) return;
    setRegenerating(true);
    try {
      const res = await adminFetch(ADMIN_API.editQuiz(editingQuiz.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: form.question,
          options: form.options,
          answer_option_index: form.answer_option_index,
          regenerate_explanation: true,
        }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const json = await res.json();
      setForm((prev) => ({ ...prev, explanation: json.data?.explanation ?? "" }));
      toast.success("Explanation regenerated");
      loadQuizzes();
    } catch (err) {
      toast.error(`Failed to regenerate: ${err}`);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDelete(quiz: AdminQuiz) {
    if (!window.confirm(`Delete the ${quiz.hashtag} quiz for ${quiz.date}?`)) return;
    setDeletingId(quiz.id);
    try {
      const res = await adminFetch(ADMIN_API.deleteQuiz(quiz.id), { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success("Quiz deleted");
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    } catch (err) {
      toast.error(`Failed to delete: ${err}`);
    } finally {
      setDeletingId(null);
    }
  }

  const covered = quizzes.length;
  const total = localities.length;

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <AiPromptBox promptKey="QUIZ_EXPLANATION" />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold text-zinc-200">
            Quizzes — {filterDate}
          </h1>
          {!localitiesLoading && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {covered} / {total} localities covered
            </p>
          )}
        </div>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />

        <Button onClick={() => loadQuizzes()} variant="ghost" size="sm" className="text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Create / Edit modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-200 mb-4">
              {editingQuiz
                ? `Edit Quiz — ${editingQuiz.locality_name} (${editingQuiz.date})`
                : `Add Quiz — ${localities.find((l) => String(l.id) === form.locality_id)?.name ?? "…"} (${form.date})`}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400">Question *</label>
                  <span className={`text-xs ${form.question.length > QUESTION_MAX * 0.85 ? "text-amber-400" : "text-zinc-500"}`}>
                    {form.question.length}/{QUESTION_MAX}
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  maxLength={QUESTION_MAX}
                  value={form.question}
                  onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                  placeholder="e.g. Which lake is Bengaluru's largest?"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {form.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="answer"
                    title="Correct answer"
                    checked={form.answer_option_index === i + 1}
                    onChange={() => setForm((p) => ({ ...p, answer_option_index: i + 1 }))}
                    className="accent-emerald-600"
                  />
                  <div className="flex-1 relative">
                    <Input
                      required
                      maxLength={OPTION_MAX}
                      value={option}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200 pr-10"
                    />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${option.length > OPTION_MAX * 0.85 ? "text-amber-400" : "text-zinc-600"}`}>
                      {option.length}/{OPTION_MAX}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-zinc-500">Select the radio next to the correct option.</p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400 block">
                    Explanation {editingQuiz ? "" : "(blank = Groq generates one)"}
                  </label>
                  {editingQuiz && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="h-6 px-2 text-xs text-violet-400 hover:text-violet-300"
                    >
                      {regenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      Regenerate
                    </Button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
                  placeholder="Shown to users after they attempt the quiz"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  {editingQuiz ? "Save Changes" : "Create Quiz"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Locality × quiz table ── */}
      {loading || localitiesLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-zinc-400 text-sm">Loading…</p>
        </div>
      ) : localities.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-zinc-400 font-medium">No saved-user localities found</p>
          <p className="text-zinc-500 text-sm">Quizzes only appear for localities with at least one registered user.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-44">Locality</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Answer</th>
                <th className="px-4 py-3">Explanation</th>
                <th className="px-4 py-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {localities.map((locality) => {
                const quiz = quizByLocality[locality.id];
                return (
                  <tr
                    key={locality.id}
                    className={`transition ${quiz ? "bg-zinc-950 hover:bg-zinc-900/60" : "bg-zinc-950/40 hover:bg-zinc-900/30"}`}
                  >
                    {/* Locality */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-zinc-200 font-medium">{locality.name}</span>
                      <p className="text-xs text-zinc-600">{locality.hashtag}</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {quiz ? (
                        <Badge className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 gap-1">
                          <CircleDashed className="w-3 h-3" />
                          Missing
                        </Badge>
                      )}
                    </td>

                    {/* Question */}
                    <td className="px-4 py-3 max-w-xs">
                      {quiz ? (
                        <>
                          <span className="text-zinc-200 block truncate" title={quiz.question}>
                            {quiz.question}
                          </span>
                          <p className="text-xs text-zinc-600 truncate" title={quiz.options.join(" | ")}>
                            {quiz.options.join(" | ")}
                          </p>
                        </>
                      ) : (
                        <span className="text-zinc-600 italic text-xs">No quiz yet</span>
                      )}
                    </td>

                    {/* Answer */}
                    <td className="px-4 py-3">
                      {quiz ? (
                        <Badge variant="outline" className="text-xs border-emerald-800 text-emerald-400">
                          {quiz.options[quiz.answer_option_index - 1]}
                        </Badge>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Explanation */}
                    <td className="px-4 py-3 max-w-[200px]">
                      {quiz ? (
                        <span className="text-xs text-zinc-500 block truncate" title={quiz.explanation ?? ""}>
                          {quiz.explanation || "—"}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {quiz ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(quiz)}
                            title="Edit quiz"
                            className="h-7 px-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 text-xs"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(quiz)}
                            disabled={quiz.has_attempts || deletingId === quiz.id}
                            title={quiz.has_attempts ? "Has user attempts — cannot delete" : "Delete quiz"}
                            className="h-7 px-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 text-xs disabled:opacity-40"
                          >
                            {deletingId === quiz.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openCreate(locality)}
                          title="Add quiz for this locality"
                          className="h-7 px-2 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
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
