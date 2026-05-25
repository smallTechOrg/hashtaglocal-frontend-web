"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { AdminEvent } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// datetime-local needs "YYYY-MM-DDTHH:mm"
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-600 text-white",
  REJECTED: "bg-red-600 text-white",
  PENDING: "bg-amber-600 text-white",
};

const EVENT_TYPES = [
  "OTHER","CLEANLINESS_DRIVE","BEACH_CLEANUP","ROAD_CLEANUP","FOREST_CLEANUP",
  "TREEPLANTATION","TREKANDPLOG","VOLUNTEERING","WORKSHOP",
];

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Create form ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", organisation: "", address: "",
    start_time: "", end_time: "", link: "", type: "OTHER",
  });

  // ── Edit form ──
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", organisation: "", address: "",
    start_time: "", end_time: "", link: "", type: "OTHER", display_name: "",
  });

  // ── Delete confirm ──
  const [deletingEvent, setDeletingEvent] = useState<AdminEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.eventHistory, { signal });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      const list: AdminEvent[] = json.data?.events ?? [];
      setEvents(list);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(`Failed to load events: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setEvents([]);
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  // datetime-local gives "YYYY-MM-DDTHH:mm" — backend needs seconds
  function toLocalDateTime(val: string): string | null {
    if (!val) return null;
    return val.length === 16 ? val + ":00" : val;
  }

  // ── Create ──
  function setCreateField(field: string, value: string) {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await adminFetch(ADMIN_API.createEvent, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          organisation: createForm.organisation || null,
          address: createForm.address,
          start_time: toLocalDateTime(createForm.start_time),
          end_time: toLocalDateTime(createForm.end_time) || null,
          link: createForm.link,
          type: createForm.type,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success("Event created and live");
      setShowCreateForm(false);
      setCreateForm({ name: "", organisation: "", address: "", start_time: "", end_time: "", link: "", type: "OTHER" });
      loadEvents();
    } catch (err) {
      toast.error(`Failed to create event: ${err}`);
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ──
  function openEdit(event: AdminEvent) {
    setEditForm({
      name: event.name,
      organisation: event.organisation ?? "",
      address: event.address ?? "",
      start_time: toDatetimeLocal(event.start_time),
      end_time: toDatetimeLocal(event.end_time),
      link: event.link,
      type: event.type ?? "OTHER",
      display_name: event.display_name ?? "",
    });
    setEditingEvent(event);
  }

  function setEditField(field: string, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setSaving(true);
    try {
      const res = await adminFetch(ADMIN_API.editEvent(editingEvent.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || null,
          organisation: editForm.organisation || null,
          address: editForm.address || null,
          start_time: toLocalDateTime(editForm.start_time),
          end_time: toLocalDateTime(editForm.end_time) || null,
          link: editForm.link || null,
          type: editForm.type || null,
          display_name: editForm.display_name || null,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success("Event updated");
      setEditingEvent(null);
      loadEvents();
    } catch (err) {
      toast.error(`Failed to update event: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──
  async function handleConfirmDelete() {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      const res = await adminFetch(ADMIN_API.deleteEvent(deletingEvent.id), { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success(`Deleted: ${deletingEvent.name}`);
      setDeletingEvent(null);
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
    } catch (err) {
      toast.error(`Failed to delete: ${err}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-zinc-200 mr-auto">
          Events ({events.length})
        </h1>

        <Button
          onClick={() => setShowCreateForm(true)}
          size="sm"
          className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Create Event
        </Button>

        <Button onClick={() => loadEvents()} variant="ghost" size="sm" className="text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Create Event modal ── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-base font-semibold text-zinc-200 mb-4">Create Event</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                <Input required value={createForm.name} onChange={(e) => setCreateField("name", e.target.value)}
                  placeholder="Event name" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Organisation</label>
                <Input value={createForm.organisation} onChange={(e) => setCreateField("organisation", e.target.value)}
                  placeholder="Organising body (optional)" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Address *</label>
                <Input required value={createForm.address} onChange={(e) => setCreateField("address", e.target.value)}
                  placeholder="Full address for geocoding" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Start time *</label>
                  <input type="datetime-local" required value={createForm.start_time}
                    onChange={(e) => setCreateField("start_time", e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">End time</label>
                  <input type="datetime-local" value={createForm.end_time}
                    onChange={(e) => setCreateField("end_time", e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Link *</label>
                <Input required type="url" value={createForm.link} onChange={(e) => setCreateField("link", e.target.value)}
                  placeholder="https://example.com/event" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                <select value={createForm.type} onChange={(e) => setCreateField("type", e.target.value)}
                  className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateForm(false)} className="text-zinc-400">Cancel</Button>
                <Button type="submit" size="sm" disabled={creating} className="bg-emerald-700 hover:bg-emerald-600 text-white">
                  {creating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Create &amp; Publish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Event modal ── */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-base font-semibold text-zinc-200 mb-4">Edit Event</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <Input value={editForm.name} onChange={(e) => setEditField("name", e.target.value)}
                  placeholder="Event name" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Display name</label>
                <Input value={editForm.display_name} onChange={(e) => setEditField("display_name", e.target.value)}
                  placeholder="Override displayed to users (leave blank to use name)" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Organisation</label>
                <Input value={editForm.organisation} onChange={(e) => setEditField("organisation", e.target.value)}
                  placeholder="Organising body" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Address</label>
                <Input value={editForm.address} onChange={(e) => setEditField("address", e.target.value)}
                  placeholder="Full address" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Start time</label>
                  <input type="datetime-local" value={editForm.start_time}
                    onChange={(e) => setEditField("start_time", e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">End time</label>
                  <input type="datetime-local" value={editForm.end_time}
                    onChange={(e) => setEditField("end_time", e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Link</label>
                <Input type="url" value={editForm.link} onChange={(e) => setEditField("link", e.target.value)}
                  placeholder="https://example.com/event" className="h-8 text-sm bg-zinc-800 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                <select value={editForm.type} onChange={(e) => setEditField("type", e.target.value)}
                  className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEvent(null)} className="text-zinc-400">Cancel</Button>
                <Button type="submit" size="sm" disabled={saving} className="bg-blue-700 hover:bg-blue-600 text-white">
                  {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Delete Event?</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Permanently delete <span className="text-zinc-200 font-medium">{deletingEvent.name}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingEvent(null)} className="text-zinc-400">Cancel</Button>
              <Button size="sm" disabled={deleting} onClick={handleConfirmDelete}
                className="bg-red-700 hover:bg-red-600 text-white">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Calendar className="w-12 h-12 text-zinc-500" />
          <p className="text-zinc-400 font-medium">No events yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Portal</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {events.map((event) => {
                return (
                  <tr key={event.id} className="bg-zinc-950 hover:bg-zinc-900/60 transition">
                    {/* Name */}
                    <td className="px-4 py-3 max-w-xs">
                      <a href={event.link} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-200 font-medium truncate block hover:text-white hover:underline" title={event.link}>
                        {event.display_name ?? event.name}
                      </a>
                      {event.display_name && event.display_name !== event.name && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate">({event.name})</p>
                      )}
                    </td>

                    {/* Portal */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-400">{event.portal ?? "—"}</span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                        {event.type ?? "—"}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      {formatDate(event.start_time)}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-xs text-zinc-500 truncate block">
                        {event.location?.name ?? event.address ?? "—"}
                      </span>
                      {event.location?.locality?.hashtags?.[0] && (
                        <span className="text-xs text-zinc-600">#{event.location.locality.hashtags[0]}</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[event.approval_status ?? "PENDING"]}`}>
                        {event.approval_status === "APPROVED" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {event.approval_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(event)}
                          title="Edit event"
                          className="h-7 px-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 text-xs">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingEvent(event)}
                          title="Delete event"
                          className="h-7 px-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 text-xs">
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
    </div>
  );
}


