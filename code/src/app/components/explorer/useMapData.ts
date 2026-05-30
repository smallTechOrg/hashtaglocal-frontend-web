"use client";
import { useEffect, useState } from "react";
import { Issue } from "../../models/issue";
import { ApiEvent, EventsResponse } from "../../models/event";
import { API_PATHS } from "../../constants/api";
import { trackError } from "../../utils/analytics";
import { toIssueSlug } from "../../../utils/issueSlug";
import { MapItem } from "./types";
import { isUpcoming, prettyType } from "./layerConfig";

interface IssuesResponse {
  data?: { issues?: Issue[] };
}

const PLACEHOLDER = "https://via.placeholder.com/150";

function issueToItem(issue: Issue): MapItem {
  const images = (issue.media_urls || [])
    .filter((m) => m.url)
    .map((m) => ({ url: m.url!, thumbnail: m.url_thumbnail }));
  const loc = issue.location;
  return {
    layer: "issues",
    id: issue.id.toString(),
    lat: loc!.lat!,
    lng: loc!.lng!,
    type: issue.type,
    title: issue.description || prettyType(issue.type) || "Issue",
    description: issue.description || "",
    images: images.length > 0 ? images : [{ url: PLACEHOLDER }],
    locationLabel:
      loc?.colloquial_name ||
      loc?.address ||
      `${loc!.lat!.toFixed(3)}, ${loc!.lng!.toFixed(3)}`,
    hashtags: loc?.locality?.hashtags,
    timestamp: issue.created_at,
    detailHref: `/issue/${toIssueSlug(
      issue.id.toString(),
      issue.type,
      loc?.locality?.hashtags,
      loc?.colloquial_name || loc?.address,
    )}`,
  };
}

function eventToItem(ev: ApiEvent): MapItem | null {
  const lat = ev.location?.lat;
  const lng = ev.location?.lng;
  if (lat == null || lng == null) return null;
  return {
    layer: "events",
    id: ev.id.toString(),
    lat,
    lng,
    type: ev.type,
    title: ev.name || "Community Event",
    description: ev.organisation
      ? `Organised by ${ev.organisation}`
      : "Community event",
    images: ev.image_url ? [{ url: ev.image_url }] : [],
    locationLabel:
      ev.location?.name ||
      ev.address ||
      `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    hashtags: ev.location?.locality?.hashtags,
    timestamp: ev.start_time,
    endTime: ev.end_time,
    organisation: ev.organisation,
    link: ev.link,
  };
}

interface MapData {
  issues: MapItem[];
  events: MapItem[];
  chat: MapItem[];
  loading: boolean;
}

export function useMapData(): MapData {
  const [issues, setIssues] = useState<MapItem[]>([]);
  const [events, setEvents] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const opts = { signal: controller.signal, cache: "no-store" as const };

      const issuesP = fetch(API_PATHS.issues, opts)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((p: IssuesResponse) =>
          (p.data?.issues || [])
            .filter((i) => i.status === "OPEN")
            .filter((i) => i.location?.lat && i.location?.lng)
            .map(issueToItem),
        )
        .catch((err) => {
          if (!controller.signal.aborted) {
            trackError("api_load_error", String(err), "explorer_issues");
          }
          return [] as MapItem[];
        });

      const eventsP = fetch(API_PATHS.events, opts)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((p: EventsResponse) =>
          (p.data?.events || [])
            .map(eventToItem)
            .filter((e): e is MapItem => e !== null)
            .filter((e) => isUpcoming(e.timestamp)),
        )
        .catch((err) => {
          if (!controller.signal.aborted) {
            trackError("api_load_error", String(err), "explorer_events");
          }
          return [] as MapItem[];
        });

      // Chat is NOT a map layer — the Chat tab's ChatView fetches its own feed. We don't load
      // chat as map markers here.
      const [issueItems, eventItems] = await Promise.all([issuesP, eventsP]);
      if (controller.signal.aborted) return;

      issueItems.sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime(),
      );
      eventItems.sort(
        (a, b) =>
          new Date(a.timestamp || 0).getTime() -
          new Date(b.timestamp || 0).getTime(),
      );

      setIssues(issueItems);
      setEvents(eventItems);
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, []);

  // `chat` is kept (always empty) so map-layer machinery still typechecks; chat is panel-only.
  return { issues, events, chat: [], loading };
}
