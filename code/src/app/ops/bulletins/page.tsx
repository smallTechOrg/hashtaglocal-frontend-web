"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { AdminBulletin, AdminLocalityOption } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Newspaper, Pencil, Play, Check, X } from "lucide-react";
import { toast } from "sonner";
import AiPromptBox from "../components/AiPromptBox";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)}${suffix}`;
}

export default function BulletinsPage() {
  const [bulletins, setBulletins] = useState<AdminBulletin[]>([]);
  const [localities, setLocalities] = useState<AdminLocalityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // filters
  const [filterLocality, setFilterLocality] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>(todayISO());

  // inline summary editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  const loadBulletins = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const url = ADMIN_API.bulletins(
          filterLocality ? Number(filterLocality) : null,
          filterDate || null,
        );
        const res = await adminFetch(url, { signal });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setBulletins(json.data ?? []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(`Failed to load bulletins: ${err}`);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filterLocality, filterDate],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadBulletins(controller.signal);
    return () => controller.abort();
  }, [loadBulletins]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch(ADMIN_API.quizLocalities);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setLocalities(json.data ?? []);
      } catch (err) {
        toast.error(`Failed to load localities: ${err}`);
      }
    })();
  }, []);

  /** Manual run of the daily weather generation (idempotent per locality+day). */
  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await adminFetch(ADMIN_API.generateBulletins, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const r = json.data;
      toast.success(
        `Generation done: ${r?.generated ?? 0} generated, ${r?.skipped ?? 0} skipped, ${r?.failed ?? 0} failed`,
      );
      loadBulletins();
    } catch (err) {
      toast.error(`Generation failed: ${err}`);
    } finally {
      setGenerating(false);
    }
  }

  function openSummaryEdit(bulletin: AdminBulletin) {
    setEditingId(bulletin.id);
    setSummaryDraft(bulletin.summary ?? "");
  }

  async function handleSaveSummary(bulletinId: number) {
    setSavingSummary(true);
    try {
      const res = await adminFetch(ADMIN_API.editBulletinSummary(bulletinId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summaryDraft }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success("Summary updated (feed post synced)");
      setBulletins((prev) =>
        prev.map((b) => (b.id === bulletinId ? { ...b, summary: summaryDraft } : b)),
      );
      setEditingId(null);
    } catch (err) {
      toast.error(`Failed to update summary: ${err}`);
    } finally {
      setSavingSummary(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <AiPromptBox
          promptKey="WEATHER_SUMMARY"
          label="Weather Summary prompt — daily 8 AM cron & Generate Now (one-line advice shown in the bulletin)"
        />
      </div>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-zinc-200 mr-auto">
          Bulletins ({bulletins.length})
        </h1>

        <select
          value={filterLocality}
          onChange={(e) => setFilterLocality(e.target.value)}
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">All localities</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.hashtag})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />

        <Button
          onClick={handleGenerate}
          size="sm"
          disabled={generating}
          title="Run the daily weather generation now (same as the 8 AM cron)"
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
        >
          {generating ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Play className="w-3 h-3 mr-1" />
          )}
          Generate Now
        </Button>

        <Button onClick={() => loadBulletins()} variant="ghost" size="sm" className="text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-zinc-400 text-sm">Loading bulletins…</p>
        </div>
      ) : bulletins.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Newspaper className="w-12 h-12 text-zinc-500" />
          <p className="text-zinc-400 font-medium">No bulletins for this filter</p>
          <p className="text-zinc-500 text-sm">
            The weather job runs daily at 8 AM for saved-user localities — or use Generate Now.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Locality</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Min / Max</th>
                <th className="px-4 py-3">Humidity</th>
                <th className="px-4 py-3">Rain</th>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3 w-[320px]">AI Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {bulletins.map((b) => (
                <tr key={b.id} className="bg-zinc-950 hover:bg-zinc-900/60 transition align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-zinc-200">{b.locality_name}</span>
                    <p className="text-xs text-zinc-600">{b.hashtag}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{b.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                    {fmt(b.weather?.min_temp, "°")} / {fmt(b.weather?.max_temp, "°")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {fmt(b.weather?.humidity, "%")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {fmt(b.weather?.rain_probability, "%")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {b.quiz_id ? (
                      <span className="text-xs text-emerald-400">#{b.quiz_id}</span>
                    ) : (
                      <span className="text-xs text-amber-500">missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === b.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={summaryDraft}
                          onChange={(e) => setSummaryDraft(e.target.value)}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-6 px-2 text-zinc-400 text-xs"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveSummary(b.id)}
                            disabled={savingSummary || !summaryDraft.trim()}
                            className="h-6 px-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                          >
                            {savingSummary ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-zinc-400 flex-1">{b.summary || "—"}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSummaryEdit(b)}
                          title="Edit summary"
                          className="h-6 px-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
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
