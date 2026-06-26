"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Loader2, ChevronDown, ChevronUp, ExternalLink, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { toast } from "sonner";

// ---- Types ----

type WeekPoint = {
  weekLabel: string;
  weekYear: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isCurrentWeek: boolean;
  newUsers: number;
  activeUsers: number;
  notificationsSent: number;
  issuesReported: number;
  issuesVerified: number;
  dailyAvgQuiz: number;
  uniqueQuizUsers: number;
};

type OpsSummary = {
  pendingIssueActions: number;
  pendingEvents: number;
  feedModerationQueue: number;
};

type DetailItem = {
  username?: string;
  locality?: string;
  platform?: string;
  date?: string;
  issueKey?: string;
};

type MetricKey = keyof Omit<WeekPoint, "weekLabel" | "weekYear" | "weekNumber" | "startDate" | "endDate" | "isCurrentWeek">;

type WeekRef = { year: number; week: number };

// ---- Constants ----

const TARGETS: Partial<Record<MetricKey, number>> = {
  newUsers: 20,
  activeUsers: 10,
  issuesReported: 10,
  issuesVerified: 5,
};

const METRIC_LABELS: Record<MetricKey, string> = {
  newUsers: "New Users",
  activeUsers: "Active Users",
  notificationsSent: "Notifications Sent",
  issuesReported: "Issues Reported",
  issuesVerified: "Issues Verified",
  dailyAvgQuiz: "Daily Avg Quiz",
  uniqueQuizUsers: "Unique Quiz Users",
};

const METRIC_COLORS: Record<MetricKey, string> = {
  newUsers: "#34d399",
  activeUsers: "#38bdf8",
  notificationsSent: "#a78bfa",
  issuesReported: "#fbbf24",
  issuesVerified: "#fb923c",
  dailyAvgQuiz: "#f472b6",
  uniqueQuizUsers: "#2dd4bf",
};

const DRILLDOWN_METRICS: MetricKey[] = [
  "newUsers",
  "activeUsers",
  "issuesReported",
  "issuesVerified",
  "uniqueQuizUsers",
];

const USER_METRICS: MetricKey[] = ["newUsers", "activeUsers", "notificationsSent"];
const ENGAGEMENT_METRICS: MetricKey[] = [
  "issuesReported",
  "issuesVerified",
  "dailyAvgQuiz",
  "uniqueQuizUsers",
];

const DRILLDOWN_METRIC_KEYS: Record<MetricKey, string> = {
  newUsers: "NEW_USERS",
  activeUsers: "ACTIVE_USERS",
  issuesReported: "ISSUES_REPORTED",
  issuesVerified: "ISSUES_VERIFIED",
  uniqueQuizUsers: "QUIZ_USERS",
  notificationsSent: "",
  dailyAvgQuiz: "",
};

// ---- ISO week helpers ----

function currentIsoWeek(): WeekRef {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return {
    year: utc.getUTCFullYear(),
    week: Math.ceil(((utc.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7),
  };
}

function isoWeekStartDate(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4.getTime() - (dow - 1) * 86400000);
  return new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000);
}

function offsetWeek(ref: WeekRef, offsetWeeks: number): WeekRef {
  const start = isoWeekStartDate(ref.year, ref.week);
  const offset = new Date(start.getTime() + offsetWeeks * 7 * 86400000);
  const utc = new Date(Date.UTC(offset.getUTCFullYear(), offset.getUTCMonth(), offset.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return {
    year: utc.getUTCFullYear(),
    week: Math.ceil(((utc.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7),
  };
}

function weekRefToInput(ref: WeekRef): string {
  return `${ref.year}-W${String(ref.week).padStart(2, "0")}`;
}

function inputToWeekRef(value: string): WeekRef | null {
  const match = value.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function weekLabel(w: WeekPoint): string {
  if (w.weekLabel) return w.weekLabel;
  if (w.weekNumber != null) return `W${w.weekNumber}`;
  return "?";
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ---- Cell color helpers ----

function cellColor(metric: MetricKey, value: number): string {
  const target = TARGETS[metric];
  if (target === undefined) return "text-white";
  return value >= target ? "text-emerald-400" : "text-red-400";
}

function cardVariant(metric: MetricKey, value: number) {
  const target = TARGETS[metric];
  if (target === undefined)
    return { bg: "bg-zinc-800 border-zinc-700", num: "text-white", hint: "text-blue-400" };
  if (value >= target)
    return { bg: "bg-emerald-950 border-emerald-700", num: "text-emerald-300", hint: "text-emerald-600" };
  return { bg: "bg-red-950 border-red-800", num: "text-red-300", hint: "text-red-700" };
}

// ---- Main Page ----

export default function MetricsPage() {
  const cur = currentIsoWeek();

  const [fromWeek, setFromWeek] = useState<WeekRef>(() => offsetWeek(cur, -7));
  const [toWeek, setToWeek] = useState<WeekRef>(cur);

  const [weeks, setWeeks] = useState<WeekPoint[]>([]);
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [drilldown, setDrilldown] = useState<{
    metric: MetricKey;
    weekYear: number;
    weekNumber: number;
    label: string;
    items: DetailItem[] | null;
    loading: boolean;
  } | null>(null);

  const fetchMetrics = useCallback(async (from: WeekRef, to: WeekRef) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromWeekYear: String(from.year),
        fromWeekNumber: String(from.week),
        toWeekYear: String(to.year),
        toWeekNumber: String(to.week),
      });
      const res = await adminFetch(`${ADMIN_API.metrics}?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setWeeks(json.data?.weeks ?? []);
    } catch {
      toast.error("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.metricsOpsSummary);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setSummary(json.data ?? null);
    } catch {
      toast.error("Failed to load ops summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(fromWeek, toWeek);
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDrilldown(metric: MetricKey, weekYear: number, weekNumber: number, label: string) {
    const key = DRILLDOWN_METRIC_KEYS[metric];
    if (!key) return;
    if (drilldown?.metric === metric && drilldown.weekYear === weekYear && drilldown.weekNumber === weekNumber) {
      setDrilldown(null);
      return;
    }
    setDrilldown({ metric, weekYear, weekNumber, label, items: null, loading: true });
    try {
      const params = new URLSearchParams({ metric: key, weekYear: String(weekYear), weekNumber: String(weekNumber) });
      const res = await adminFetch(`${ADMIN_API.metricsDetail}?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setDrilldown((prev) => prev ? { ...prev, items: json.data?.items ?? [], loading: false } : null);
    } catch {
      toast.error("Failed to load detail");
      setDrilldown(null);
    }
  }

  function applyPreset(numWeeks: number) {
    const to = currentIsoWeek();
    const from = offsetWeek(to, -(numWeeks - 1));
    setFromWeek(from);
    setToWeek(to);
    fetchMetrics(from, to);
  }

  function applyFilter(from: WeekRef, to: WeekRef) {
    setFromWeek(from);
    setToWeek(to);
    fetchMetrics(from, to);
  }

  const currentWeek = weeks[weeks.length - 1];

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-semibold text-white">Key Metrics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Weekly product and engagement metrics.</p>
      </div>

      {/* Open Actions */}
      <section>
        <SectionLabel>Open Actions</SectionLabel>
        {summaryLoading ? (
          <div className="flex items-center gap-2 text-zinc-300 text-sm h-20">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OpsSummaryCard label="Pending Issue Actions" count={summary.pendingIssueActions} href="/ops/review" />
            <OpsSummaryCard label="Pending Events" count={summary.pendingEvents} href="/ops/events" />
            <OpsSummaryCard label="Feed Moderation Queue" count={summary.feedModerationQueue} href="/ops/feed" />
          </div>
        ) : (
          <p className="text-red-400 text-sm">Could not load summary.</p>
        )}
      </section>

      {/* Week Range Filter */}
      <WeekRangeFilter
        from={fromWeek}
        to={toWeek}
        onApply={applyFilter}
        onPreset={applyPreset}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-300 text-sm py-16 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading metrics…
        </div>
      ) : weeks.length === 0 ? (
        <p className="text-zinc-300 text-sm py-8 text-center">No data for this range.</p>
      ) : (
        <>
          {/* Current Week Summary Cards */}
          {currentWeek && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <SectionLabel>
                  {currentWeek.isCurrentWeek
                    ? `This Week — W${currentWeek.weekNumber ?? "?"}`
                    : `Week ${currentWeek.weekNumber ?? "?"}, ${currentWeek.weekYear ?? ""}`}
                </SectionLabel>
                {currentWeek.isCurrentWeek && (
                  <span className="text-[10px] bg-blue-900 text-blue-200 rounded-full px-2 py-0.5 font-semibold">
                    LIVE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
                  const val = (currentWeek[key] ?? 0) as number;
                  const target = TARGETS[key];
                  const v = cardVariant(key, val);
                  return (
                    <div key={key} className={`rounded-xl border p-4 ${v.bg}`}>
                      <p className="text-xs text-zinc-300 mb-2 font-medium">{METRIC_LABELS[key]}</p>
                      <p className={`text-3xl font-bold tracking-tight ${v.num}`}>
                        {key === "dailyAvgQuiz" ? Number(val).toFixed(1) : val}
                      </p>
                      {target !== undefined && (
                        <p className={`text-xs mt-1.5 font-medium ${v.hint}`}>
                          {val >= target ? `✓ target ${target}` : `${target - val} below target ${target}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Weekly Breakdown Table */}
          <section>
            <SectionLabel>Weekly Breakdown</SectionLabel>
            <div className="overflow-x-auto rounded-xl border border-zinc-700">
              <table className="text-sm w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-700">
                    <th className="sticky left-0 z-10 bg-zinc-900 text-left px-4 py-3 text-xs text-white font-semibold min-w-[170px] border-r border-zinc-700">
                      Metric
                    </th>
                    <th className="px-3 py-3 text-xs text-zinc-300 font-semibold text-right min-w-[52px] border-r border-zinc-700">
                      Target
                    </th>
                    {weeks.map((w) => (
                      <th
                        key={`${w.weekYear}-${w.weekNumber}`}
                        className={`px-3 py-3 text-center min-w-[72px] ${w.isCurrentWeek ? "bg-blue-950/50" : ""}`}
                      >
                        <div className="text-xs font-bold text-white">{weekLabel(w)}</div>
                        <div className="text-[10px] text-zinc-300 mt-0.5">
                          {fmtDate(w.startDate)}
                          {w.isCurrentWeek && (
                            <span className="ml-1 text-[9px] bg-blue-800 text-blue-100 rounded px-1 font-medium">now</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CategoryRow label="User" colCount={weeks.length} />
                  {USER_METRICS.map((key) => (
                    <MetricRow key={key} metricKey={key} weeks={weeks} drilldown={drilldown} onCellClick={openDrilldown} />
                  ))}
                  <CategoryRow label="Engagement" colCount={weeks.length} />
                  {ENGAGEMENT_METRICS.map((key) => (
                    <MetricRow key={key} metricKey={key} weeks={weeks} drilldown={drilldown} onCellClick={openDrilldown} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Drill-down panel */}
            {drilldown && (
              <div className="mt-3 rounded-xl border border-zinc-600 bg-zinc-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-white">{METRIC_LABELS[drilldown.metric]}</p>
                    <p className="text-xs text-zinc-300 mt-0.5">{drilldown.label}</p>
                  </div>
                  <button onClick={() => setDrilldown(null)} className="text-zinc-300 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {drilldown.loading ? (
                  <div className="flex items-center gap-2 text-zinc-300 text-sm py-6 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : !drilldown.items || drilldown.items.length === 0 ? (
                  <p className="text-zinc-300 text-sm text-center py-4">No records for this week.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          {drilldown.items[0]?.username !== undefined && (
                            <th className="text-left pb-2 text-zinc-200 font-semibold pr-6">Username</th>
                          )}
                          {drilldown.items[0]?.issueKey !== undefined && (
                            <th className="text-left pb-2 text-zinc-200 font-semibold pr-6">Issue</th>
                          )}
                          <th className="text-left pb-2 text-zinc-200 font-semibold pr-6">Locality</th>
                          {drilldown.items[0]?.platform !== undefined && (
                            <th className="text-left pb-2 text-zinc-200 font-semibold pr-6">Platform</th>
                          )}
                          {drilldown.items[0]?.date !== undefined && (
                            <th className="text-left pb-2 text-zinc-200 font-semibold">Date</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {drilldown.items.map((item, i) => (
                          <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                            {item.username !== undefined && (
                              <td className="py-2 pr-6 text-white font-medium">@{item.username ?? "—"}</td>
                            )}
                            {item.issueKey !== undefined && (
                              <td className="py-2 pr-6 text-blue-300 font-mono">{item.issueKey ?? "—"}</td>
                            )}
                            <td className="py-2 pr-6 text-zinc-300">{item.locality ?? "—"}</td>
                            {item.platform !== undefined && (
                              <td className="py-2 pr-6"><PlatformBadge platform={item.platform} /></td>
                            )}
                            {item.date !== undefined && (
                              <td className="py-2 text-zinc-400">
                                {item.date ? item.date.replace("T", " ").substring(0, 16) : "—"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Trend Charts */}
          <section className="space-y-4">
            <SectionLabel>Trends</SectionLabel>
            <MetricChart title="User" metrics={USER_METRICS} weeks={weeks} />
            <MetricChart title="Engagement" metrics={ENGAGEMENT_METRICS} weeks={weeks} />
          </section>
        </>
      )}
    </div>
  );
}

// ---- Shared label ----

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-widest mb-3">{children}</h2>
  );
}

// ---- Week Range Filter ----

function WeekRangeFilter({
  from,
  to,
  onApply,
  onPreset,
}: {
  from: WeekRef;
  to: WeekRef;
  onApply: (from: WeekRef, to: WeekRef) => void;
  onPreset: (n: number) => void;
}) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  useEffect(() => { setLocalFrom(from); }, [from]);
  useEffect(() => { setLocalTo(to); }, [to]);

  return (
    <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Single unified range bar */}
        <div className="flex items-center rounded-lg border border-zinc-600 bg-zinc-800 overflow-hidden divide-x divide-zinc-600">
          <div className="flex flex-col px-3 py-2">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">From</span>
            <input
              type="week"
              value={weekRefToInput(localFrom)}
              onChange={(e) => {
                const ref = inputToWeekRef(e.target.value);
                if (ref) setLocalFrom(ref);
              }}
              className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark] w-36"
            />
          </div>
          <div className="px-3 text-zinc-500 text-sm self-stretch flex items-center">→</div>
          <div className="flex flex-col px-3 py-2">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">To</span>
            <input
              type="week"
              value={weekRefToInput(localTo)}
              onChange={(e) => {
                const ref = inputToWeekRef(e.target.value);
                if (ref) setLocalTo(ref);
              }}
              className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark] w-36"
            />
          </div>
          <button
            onClick={() => onApply(localFrom, localTo)}
            className="px-4 self-stretch text-sm bg-blue-600 hover:bg-blue-500 text-white transition font-semibold"
          >
            Apply
          </button>
        </div>

        <div className="flex gap-2 ml-auto">
          {[4, 8, 12].map((n) => (
            <button
              key={n}
              onClick={() => onPreset(n)}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-600 transition font-medium"
            >
              Last {n}w
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Ops Summary Card ----

function OpsSummaryCard({ label, count, href }: { label: string; count: number; href: string }) {
  const hasItems = count > 0;
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl border p-4 transition hover:brightness-110 ${
        hasItems ? "bg-red-950 border-red-700" : "bg-emerald-950 border-emerald-700"
      }`}
    >
      <div className="flex items-start gap-3">
        {hasItems
          ? <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          : <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        }
        <div>
          <p className="text-xs text-zinc-200 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${hasItems ? "text-red-300" : "text-emerald-300"}`}>
            {count}
          </p>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
    </Link>
  );
}

// ---- Table helpers ----

function CategoryRow({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-zinc-800 border-y border-zinc-700">
      <td colSpan={colCount + 2} className="sticky left-0 px-4 py-1.5 text-[11px] font-bold text-white uppercase tracking-widest bg-zinc-800">
        {label}
      </td>
    </tr>
  );
}

function MetricRow({
  metricKey,
  weeks,
  drilldown,
  onCellClick,
}: {
  metricKey: MetricKey;
  weeks: WeekPoint[];
  drilldown: { metric: MetricKey; weekYear: number; weekNumber: number } | null;
  onCellClick: (metric: MetricKey, weekYear: number, weekNumber: number, label: string) => void;
}) {
  const target = TARGETS[metricKey];
  const canDrill = DRILLDOWN_METRICS.includes(metricKey);
  const isRowOpen = drilldown?.metric === metricKey;

  return (
    <tr className={`border-b border-zinc-800 transition-colors ${isRowOpen ? "bg-zinc-800/50" : "hover:bg-zinc-800/20"}`}>
      <td className={`sticky left-0 z-10 px-4 py-3 border-r border-zinc-800 ${isRowOpen ? "bg-zinc-800" : "bg-zinc-950"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-100 font-semibold">{METRIC_LABELS[metricKey]}</span>
          {canDrill && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              isRowOpen
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-zinc-800 text-zinc-300 border-zinc-600"
            }`}>
              details
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-300 text-right border-r border-zinc-800 font-mono font-semibold">
        {target !== undefined ? target : "—"}
      </td>
      {weeks.map((w) => {
        const val = (w[metricKey] ?? 0) as number;
        const isSelected =
          drilldown?.metric === metricKey &&
          drilldown.weekYear === w.weekYear &&
          drilldown.weekNumber === w.weekNumber;
        return (
          <td
            key={`${w.weekYear}-${w.weekNumber}`}
            className={`px-2 py-2 text-center ${w.isCurrentWeek ? "bg-blue-950/20" : ""}`}
          >
            {canDrill ? (
              <button
                onClick={() => onCellClick(metricKey, w.weekYear, w.weekNumber, weekLabel(w))}
                title={`View ${METRIC_LABELS[metricKey]} details for ${weekLabel(w)}`}
                className={`group flex items-center justify-center gap-1 mx-auto rounded-md px-2 py-1.5 min-w-[44px] transition-all border ${
                  isSelected
                    ? "bg-blue-600 border-blue-400 text-white"
                    : `${cellColor(metricKey, val)} bg-zinc-900 border-zinc-700 hover:border-blue-500 hover:bg-zinc-800`
                }`}
              >
                <span className="text-xs font-bold">
                  {metricKey === "dailyAvgQuiz" ? Number(val).toFixed(1) : val}
                </span>
                {isSelected
                  ? <ChevronUp className="w-3 h-3 shrink-0" />
                  : <ChevronDown className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                }
              </button>
            ) : (
              <span className={`text-xs font-bold ${cellColor(metricKey, val)}`}>
                {metricKey === "dailyAvgQuiz" ? Number(val).toFixed(1) : val}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function PlatformBadge({ platform }: { platform?: string }) {
  if (!platform) return <span className="text-zinc-400">—</span>;
  const styles: Record<string, string> = {
    ANDROID: "bg-emerald-900 text-emerald-300",
    IOS: "bg-blue-900 text-blue-300",
    WEB: "bg-violet-900 text-violet-300",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[platform] ?? "bg-zinc-700 text-zinc-200"}`}>
      {platform}
    </span>
  );
}

// ---- Trend Charts ----

function MetricChart({ title, metrics, weeks }: { title: string; metrics: MetricKey[]; weeks: WeekPoint[] }) {
  const chartData = weeks.map((w) => {
    const row: Record<string, string | number> = { name: weekLabel(w) };
    metrics.forEach((m) => {
      row[m] = m === "dailyAvgQuiz"
        ? Number(Number(w[m] ?? 0).toFixed(1))
        : ((w[m] ?? 0) as number);
    });
    return row;
  });

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-xs font-bold text-white uppercase tracking-widest mb-5">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="name" tick={{ fill: "#d4d4d8", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "#d4d4d8", fontSize: 11 }} width={32} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #52525b", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#ffffff", fontWeight: 700 }}
            itemStyle={{ color: "#e4e4e7" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#d4d4d8", paddingTop: 8 }} />
          {metrics.map((m) => (
            <Line
              key={m}
              type="monotone"
              dataKey={m}
              name={METRIC_LABELS[m]}
              stroke={METRIC_COLORS[m]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
          {metrics.map((m) => {
            const target = TARGETS[m];
            return target !== undefined ? (
              <ReferenceLine key={`ref-${m}`} y={target} stroke={METRIC_COLORS[m]} strokeDasharray="4 4" strokeOpacity={0.4} />
            ) : null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
