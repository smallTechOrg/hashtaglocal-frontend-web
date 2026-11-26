"use client";

// Event sources: the scraper0 sites + read actions that the event ingestion job reads. Talks to
// the backend /admin/event-sources API (ADMIN only). A site has to be onboarded in scraper0 first
// (its read action learned and locked); this page only picks from what scraper0 already serves.

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API, SCRAPER0_DASHBOARD_URL } from "../lib/constants";
import {
  DEFAULT_ACTION,
  DEFAULT_FRESHNESS_HOURS,
  EventSource,
  EventSourceInput,
  EventSourceRunStatus,
  EventSourceTestResult,
  Scraper0Site,
  lockedReadActions,
} from "../lib/eventSourceTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  ExternalLink,
  FlaskConical,
  Globe,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

const JSON_HEADERS = { "Content-Type": "application/json" };

const ONBOARD_FIRST = "Onboard this site in scraper0 first";

/** An HTTP error with the status kept, so callers can tell a 409 from a 502. */
class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The server's error text, from any of the shapes the backend uses. */
function serverMessage(body: unknown): string | null {
  const b = body as {
    message?: unknown;
    error?: { message?: unknown; errors?: { message?: unknown }[] } | string;
  } | null;
  if (!b || typeof b !== "object") return null;
  if (typeof b.message === "string" && b.message) return b.message;
  if (typeof b.error === "string" && b.error) return b.error;
  if (b.error && typeof b.error === "object") {
    const detail = b.error.errors?.[0]?.message;
    if (typeof detail === "string" && detail) return detail;
    if (typeof b.error.message === "string" && b.error.message) return b.error.message;
  }
  return null;
}

/**
 * Reads a JSON response (with or without the backend's { data } envelope), or throws an ApiError
 * whose message is ready to show: 409 is a duplicate site + action, and the scraper0 codes
 * site_not_onboarded / action_not_available become "Onboard this site in scraper0 first".
 */
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = serverMessage(body);
    if (res.status === 403) throw new ApiError("Only administrators can manage event sources.", 403);
    if (res.status === 409) {
      throw new ApiError(
        "An event source for this site and action already exists. Edit that one instead.",
        409,
      );
    }
    if (msg && /site_not_onboarded|action_not_available/.test(msg)) {
      throw new ApiError(`${ONBOARD_FIRST}. (${msg})`, res.status);
    }
    if (res.status === 502) {
      throw new ApiError(msg ? `scraper0: ${msg}` : "scraper0 did not answer (502)", 502);
    }
    throw new ApiError(msg ?? `Request failed (${res.status})`, res.status);
  }
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

const STATUS_STYLES: Record<EventSourceRunStatus, string> = {
  ok: "bg-emerald-600 text-white",
  partial: "bg-amber-600 text-white",
  error: "bg-red-600 text-white",
};

function toInput(s: EventSource): EventSourceInput {
  return {
    name: s.name,
    site_id: s.site_id,
    action: s.action,
    event_filter: s.event_filter,
    category_filter: s.category_filter,
    include_online: s.include_online,
    freshness_hours: s.freshness_hours,
    enabled: s.enabled,
  };
}

/** A small on/off switch (no shadcn Switch in this repo yet). */
function Toggle({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-40 ${
        checked ? "bg-emerald-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Scraper0Link({ children }: { children: React.ReactNode }) {
  if (!SCRAPER0_DASHBOARD_URL) return null;
  return (
    <a
      href={SCRAPER0_DASHBOARD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export default function EventSourcesPage() {
  const [sources, setSources] = useState<EventSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);

  /** null: closed; "new": create; a source: edit. */
  const [editing, setEditing] = useState<EventSource | "new" | null>(null);
  const [deleting, setDeleting] = useState<EventSource | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [testing, setTesting] = useState<EventSource | null>(null);
  const [expandedError, setExpandedError] = useState<number | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await readJson<EventSource[]>(
        await adminFetch(ADMIN_API.eventSources, { signal }),
      );
      setSources(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(errorText(err, "Could not load event sources"));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function setProcessingState(id: number, active: boolean) {
    setProcessing((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleToggleEnabled(source: EventSource, enabled: boolean) {
    setProcessingState(source.id, true);
    try {
      const updated = await readJson<EventSource>(
        await adminFetch(ADMIN_API.eventSource(source.id), {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify({ ...toInput(source), enabled }),
        }),
      );
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? (updated ?? { ...s, enabled }) : s)),
      );
      toast.success(`${source.name} ${enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(errorText(err, "Could not update the source"));
    } finally {
      setProcessingState(source.id, false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await adminFetch(ADMIN_API.eventSource(deleting.id), { method: "DELETE" });
      await readJson<unknown>(res);
      setSources((prev) => prev.filter((s) => s.id !== deleting.id));
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
    } catch (err) {
      toast.error(errorText(err, "Could not delete the source"));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      await readJson<{ started: boolean }>(
        await adminFetch(ADMIN_API.runEventIngestion, { method: "POST" }),
      );
      toast.success(
        "Ingestion started. New events go to the Events review queue; refresh here for the run status.",
      );
    } catch (err) {
      toast.error(errorText(err, "Could not start ingestion"));
    } finally {
      setRunning(false);
    }
  }

  function handleSaved(saved: EventSource, created: boolean) {
    setSources((prev) =>
      created ? [...prev, saved] : prev.map((s) => (s.id === saved.id ? saved : s)),
    );
    setEditing(null);
    toast.success(created ? `Added ${saved.name}` : `Saved ${saved.name}`);
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-200">Event sources</h1>
          <button
            onClick={() => load()}
            disabled={loading}
            aria-label="Reload"
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunNow}
            disabled={running || sources.length === 0}
            title={sources.length === 0 ? "Add an event source first" : "Read every enabled source now"}
            className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run ingestion now
          </Button>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-emerald-700 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-4 h-4" />
            Add source
          </Button>
        </div>
      </div>
      <p className="text-sm text-zinc-400">
        Sites the event ingestion job reads through scraper0. Imported events wait in the Events
        review queue. Sites are onboarded in scraper0 first
        {SCRAPER0_DASHBOARD_URL ? (
          <>
            {" "}
            (<Scraper0Link>scraper0 dashboard</Scraper0Link>)
          </>
        ) : null}
        .
      </p>

      {loading && sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-zinc-400 text-sm">Loading event sources…</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-xl p-4">
          {loadError}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState onAdd={() => setEditing("new")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Last run</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sources.map((source) => {
                const busy = processing.has(source.id);
                const showError = expandedError === source.id;
                return (
                  <tr key={source.id} className="bg-zinc-950 hover:bg-zinc-900/60 transition align-top">
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-zinc-200 font-medium block truncate" title={source.name}>
                        {source.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        fresh within {source.freshness_hours} h
                        {source.include_online ? " · includes online" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 font-mono text-xs block">{source.site_id}</span>
                      <span className="text-xs text-zinc-500 font-mono">{source.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={source.enabled}
                          disabled={busy}
                          label={source.enabled ? `Disable ${source.name}` : `Enable ${source.name}`}
                          onChange={(next) => handleToggleEnabled(source, next)}
                        />
                        {busy && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      {source.last_run_at ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {source.last_status && (
                              <button
                                type="button"
                                disabled={!source.last_error}
                                onClick={() => setExpandedError(showError ? null : source.id)}
                                title={source.last_error ?? undefined}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  STATUS_STYLES[source.last_status] ?? "bg-zinc-700 text-white"
                                } ${source.last_error ? "cursor-pointer" : "cursor-default"}`}
                              >
                                {source.last_status !== "ok" && <AlertTriangle className="w-3 h-3" />}
                                {source.last_status}
                              </button>
                            )}
                            <span
                              className="text-xs text-zinc-400 whitespace-nowrap"
                              title={new Date(source.last_run_at).toLocaleString()}
                            >
                              {timeAgo(source.last_run_at) || formatDateTime(source.last_run_at)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {source.last_item_count ?? 0} items · {source.last_imported_count ?? 0} imported
                          </p>
                          {source.last_error && showError && (
                            <p className="text-xs text-red-300 bg-red-950/40 border border-red-900 rounded p-2 break-words max-w-sm">
                              {source.last_error}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">Not run yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(source)}
                          title="Edit source"
                          className="h-7 px-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 text-xs"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTesting(source)}
                          title="Test: read now, import nothing"
                          className="h-7 px-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 text-xs"
                        >
                          <FlaskConical className="w-3 h-3" />
                          <span className="ml-1">Test</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(source)}
                          title="Delete source"
                          className="h-7 px-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SourceFormDialog
          source={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {testing && <TestDialog source={testing} onClose={() => setTesting(null)} />}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 grid gap-3.5">
            <h2 className="text-lg font-semibold text-zinc-100">Delete {deleting.name}?</h2>
            <p className="text-sm text-zinc-400">
              Ingestion stops reading <span className="font-mono">{deleting.site_id}</span>. Events
              already imported stay. To pause it instead, turn it off with the Enabled switch.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-zinc-300" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={deleteBusy}
                onClick={handleDelete}
                className="bg-red-800 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {deleteBusy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
      <Globe className="w-12 h-12 text-zinc-500" />
      <p className="text-zinc-300 font-medium">No event sources yet</p>
      <p className="text-sm text-zinc-400 max-w-md">
        A site has to be onboarded in scraper0 before it can be added here: scraper0 learns how to
        read its events and an admin locks that read action. Then add it here to import its
        events on every ingestion run.
      </p>
      {SCRAPER0_DASHBOARD_URL ? (
        <p className="text-sm">
          <Scraper0Link>Open the scraper0 dashboard</Scraper0Link>
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Set NEXT_PUBLIC_SCRAPER0_DASHBOARD_URL to link to the scraper0 dashboard here.
        </p>
      )}
      <Button size="sm" onClick={onAdd} className="bg-emerald-700 hover:bg-emerald-600 text-white mt-1">
        <Plus className="w-4 h-4" />
        Add source
      </Button>
    </div>
  );
}

// ── Create / edit ──

function SourceFormDialog({
  source,
  onClose,
  onSaved,
}: {
  source: EventSource | null;
  onClose: () => void;
  onSaved: (saved: EventSource, created: boolean) => void;
}) {
  const [name, setName] = useState(source?.name ?? "");
  const [siteId, setSiteId] = useState(source?.site_id ?? "");
  const [action, setAction] = useState(source?.action ?? DEFAULT_ACTION);
  const [eventFilter, setEventFilter] = useState(source?.event_filter ?? "");
  const [categoryFilter, setCategoryFilter] = useState(source?.category_filter ?? "");
  const [includeOnline, setIncludeOnline] = useState(source?.include_online ?? false);
  const [freshness, setFreshness] = useState(String(source?.freshness_hours ?? DEFAULT_FRESHNESS_HOURS));
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Site picker
  const [query, setQuery] = useState("");
  const [sites, setSites] = useState<Scraper0Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(!source);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSitesLoading(true);
      setSitesError(null);
      try {
        const list = await readJson<Scraper0Site[]>(
          await adminFetch(ADMIN_API.scraper0Sites(query.trim() || null), {
            signal: controller.signal,
          }),
        );
        setSites(Array.isArray(list) ? list : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSitesError(errorText(err, "Could not load scraper0 sites"));
      } finally {
        if (!controller.signal.aborted) setSitesLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /** Only sites with a locked read action can be read by the ingestion job. */
  const usableSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites
      .filter((s) => lockedReadActions(s).length > 0)
      .filter(
        (s) =>
          !q ||
          s.site_id.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.base_url ?? "").toLowerCase().includes(q),
      );
  }, [sites, query]);
  const hiddenCount = sites.length - sites.filter((s) => lockedReadActions(s).length > 0).length;

  const selectedSite = sites.find((s) => s.site_id === siteId) ?? null;
  const siteActions = selectedSite ? lockedReadActions(selectedSite) : [];

  function pickSite(site: Scraper0Site) {
    setSiteId(site.site_id);
    const actions = lockedReadActions(site);
    if (!actions.includes(action)) {
      setAction(actions.includes(DEFAULT_ACTION) ? DEFAULT_ACTION : (actions[0] ?? DEFAULT_ACTION));
    }
    if (!name.trim()) setName(site.name || site.site_id);
    setPickerOpen(false);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const hours = Number(freshness);
    if (!siteId) return setFormError("Pick a scraper0 site.");
    if (!name.trim()) return setFormError("Enter a name.");
    if (!action.trim()) return setFormError("Enter the read action.");
    if (!Number.isInteger(hours) || hours < 1) {
      return setFormError("Freshness must be a whole number of hours (1 or more).");
    }
    const body: EventSourceInput = {
      name: name.trim(),
      site_id: siteId,
      action: action.trim(),
      event_filter: eventFilter.trim() || null,
      category_filter: categoryFilter.trim() || null,
      include_online: includeOnline,
      freshness_hours: hours,
      enabled,
    };
    setSaving(true);
    try {
      const saved = await readJson<EventSource>(
        await adminFetch(source ? ADMIN_API.eventSource(source.id) : ADMIN_API.eventSources, {
          method: source ? "PUT" : "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(body),
        }),
      );
      onSaved(saved, !source);
    } catch (err) {
      const msg = errorText(err, "Could not save");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            {source ? `Edit ${source.name}` : "Add event source"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Site */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block" htmlFor="es-site-search">
              scraper0 site *
            </label>
            {siteId && !pickerOpen ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">
                    {selectedSite?.name ?? siteId}{" "}
                    <span className="font-mono text-xs text-zinc-500">{siteId}</span>
                  </p>
                  {selectedSite?.base_url && (
                    <p className="text-xs text-zinc-500 truncate">{selectedSite.base_url}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPickerOpen(true)}
                  className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-zinc-700 bg-zinc-800">
                <div className="flex items-center gap-2 px-3 border-b border-zinc-700">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                  <input
                    id="es-site-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sites by name, id or URL"
                    className="h-8 flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                  />
                  {sitesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
                </div>
                <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
                  {sitesError ? (
                    <li className="px-3 py-2 text-xs text-red-300">{sitesError}</li>
                  ) : !sitesLoading && usableSites.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-zinc-400">
                      No onboarded site with a locked read action
                      {query.trim() ? ` matches “${query.trim()}”` : ""}. {ONBOARD_FIRST}
                      {SCRAPER0_DASHBOARD_URL ? (
                        <>
                          {": "}
                          <Scraper0Link>scraper0 dashboard</Scraper0Link>
                        </>
                      ) : (
                        "."
                      )}
                    </li>
                  ) : (
                    usableSites.map((site) => (
                      <li key={site.site_id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={site.site_id === siteId}
                          onClick={() => pickSite(site)}
                          className={`w-full text-left px-3 py-1.5 hover:bg-zinc-700/60 ${
                            site.site_id === siteId ? "bg-zinc-700/40" : ""
                          }`}
                        >
                          <span className="text-sm text-zinc-200">{site.name || site.site_id}</span>{" "}
                          <span className="font-mono text-xs text-zinc-500">{site.site_id}</span>
                          <span className="block text-xs text-zinc-500 truncate">{site.base_url}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                {hiddenCount > 0 && !sitesError && (
                  <p className="px-3 py-1.5 border-t border-zinc-700 text-xs text-zinc-500">
                    {hiddenCount} more {hiddenCount === 1 ? "site has" : "sites have"} no locked read
                    action yet and {hiddenCount === 1 ? "is" : "are"} hidden.
                  </p>
                )}
                {source && siteId && (
                  <div className="px-3 py-1.5 border-t border-zinc-700 text-right">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Keep {siteId}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action */}
          <div>
            <label htmlFor="es-action" className="text-xs text-zinc-400 mb-1 block">
              Read action *
            </label>
            {siteActions.length > 1 ? (
              <select
                id="es-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 font-mono"
              >
                {!siteActions.includes(action) && <option value={action}>{action}</option>}
                {siteActions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="es-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={DEFAULT_ACTION}
                className={`${fieldClass} font-mono`}
              />
            )}
            <p className="text-xs text-zinc-500 mt-1">
              The scraper0 read action to call. Usually {DEFAULT_ACTION}.
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="es-name" className="text-xs text-zinc-400 mb-1 block">
              Name *
            </label>
            <Input
              id="es-name"
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iVolunteer"
              className={fieldClass}
            />
          </div>

          {/* Event filter */}
          <div>
            <label htmlFor="es-event-filter" className="text-xs text-zinc-400 mb-1 block">
              Event filter
            </label>
            <textarea
              id="es-event-filter"
              rows={3}
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder="Which events to keep, in plain words, e.g. volunteering events in Bengaluru"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          {/* Category filter */}
          <div>
            <label htmlFor="es-category-filter" className="text-xs text-zinc-400 mb-1 block">
              Category filter
            </label>
            <Input
              id="es-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="e.g. environment, cleanliness"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="es-freshness" className="text-xs text-zinc-400 mb-1 block">
                Freshness (hours) *
              </label>
              <Input
                id="es-freshness"
                type="number"
                min={1}
                step={1}
                value={freshness}
                onChange={(e) => setFreshness(e.target.value)}
                className={fieldClass}
              />
              <p className="text-xs text-zinc-500 mt-1">How old scraper0&apos;s data may be.</p>
            </div>
            <div className="space-y-3 pt-5">
              <label className="flex items-center gap-2 text-sm text-zinc-300" htmlFor="es-online">
                <Toggle
                  id="es-online"
                  checked={includeOnline}
                  onChange={setIncludeOnline}
                  label="Include online events"
                />
                Include online events
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300" htmlFor="es-enabled">
                <Toggle id="es-enabled" checked={enabled} onChange={setEnabled} label="Enabled" />
                Enabled
              </label>
            </div>
          </div>

          {formError && (
            <div className="flex gap-2 bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {source ? "Save changes" : "Add source"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Test ──

function TestDialog({ source, onClose }: { source: EventSource; onClose: () => void }) {
  const [result, setResult] = useState<EventSourceTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        setResult(
          await readJson<EventSourceTestResult>(
            await adminFetch(ADMIN_API.testEventSource(source.id), { method: "POST", signal }),
          ),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = errorText(err, "Test failed");
        setError(msg);
        toast.error(msg);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [source.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    run(controller.signal);
    return () => controller.abort();
  }, [run]);

  const items = result?.items ?? [];
  const health =
    result?.health == null
      ? null
      : typeof result.health === "string"
        ? result.health
        : JSON.stringify(result.health);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 truncate">Test {source.name}</h2>
            <p className="text-xs text-zinc-500 font-mono">
              {source.site_id} / {source.action} · reads now, imports nothing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run()}
              disabled={loading}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" />
              Again
            </Button>
            <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading from scraper0… this can take up to a minute or two.
            </div>
          ) : error ? (
            <div className="flex gap-2 bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">
                {error}
                {error.startsWith(ONBOARD_FIRST) && SCRAPER0_DASHBOARD_URL && (
                  <>
                    {" "}
                    <Scraper0Link>scraper0 dashboard</Scraper0Link>
                  </>
                )}
              </span>
            </div>
          ) : result ? (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>
                  <span className="text-zinc-200 font-medium">{result.item_count}</span> items
                  {result.item_count > items.length ? ` (showing first ${items.length})` : ""}
                </span>
                <span>Scraped {formatDateTime(result.scraped_at)}</span>
                {health && <span className="break-all">Health: {health}</span>}
              </div>

              {!result.complete && (
                <div className="flex gap-2 bg-amber-950/40 border border-amber-900 text-amber-300 text-sm rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Partial — the site is still refreshing. Later runs should return more.</span>
                </div>
              )}
              {result.ai_error && (
                <div className="flex gap-2 bg-amber-950/40 border border-amber-900 text-amber-300 text-sm rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="break-words min-w-0">
                    The AI filter step failed, so the filters may not have been applied:{" "}
                    {result.ai_error}
                  </span>
                </div>
              )}

              {items.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No events came back. Check the filters, or try again once the site has refreshed.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Image</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Start</th>
                        <th className="px-3 py-2">Address</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Online</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {items.map((item, i) => (
                        <tr key={item.id ?? i} className="align-top">
                          <td className="px-3 py-2">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element -- external, arbitrary hosts
                              <img
                                src={item.image}
                                alt=""
                                loading="lazy"
                                className="w-14 h-10 object-cover rounded bg-zinc-800"
                              />
                            ) : (
                              <div className="w-14 h-10 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-amber-400/80">
                                no image
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-xs">
                            {item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-200 hover:text-white hover:underline"
                              >
                                {item.name ?? "—"}
                              </a>
                            ) : (
                              <span className="text-zinc-200">{item.name ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-zinc-400">
                            {formatDateTime(item.start_time)}
                          </td>
                          <td className="px-3 py-2 max-w-[220px] text-xs text-zinc-400">
                            {item.address ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {item.category ? (
                              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                                {item.category}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-400">
                            {item.is_online == null ? "—" : item.is_online ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
