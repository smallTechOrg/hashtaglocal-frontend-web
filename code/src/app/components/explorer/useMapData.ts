"use client";
import { useEffect, useState } from "react";
import { Issue } from "../../models/issue";
import { ApiEvent, EventsResponse } from "../../models/event";
import { API_PATHS } from "../../constants/api";
import { trackError } from "../../utils/analytics";
import { toIssueSlug } from "../../../utils/issueSlug";
import { MapItem } from "./types";
import { isUpcoming, prettyType } from "./layerConfig";
import type { FeedListResponse, FeedPost } from "../../models/feed";

interface IssuesResponse {
  data?: { issues?: Issue[] };
}

const PLACEHOLDER = "https://via.placeholder.com/150";

/** Center of India — fallback marker position for national (#india) chat posts with no locality. */
const INDIA_CENTER = { lat: 22.5937, lng: 78.9629 };

/** Maps a feed post to a map item. Uses the post's locality centroid; falls back to India center. */
function feedPostToItem(post: FeedPost): MapItem {
  const lat = post.locality_lat ?? INDIA_CENTER.lat;
  const lng = post.locality_lng ?? INDIA_CENTER.lng;
  const tag = post.hashtag ? post.hashtag.replace(/^#/, "") : undefined;
  const images = post.media_url ? [{ url: post.media_url }] : [];
  return {
    layer: "chat",
    id: post.id.toString(),
    lat,
    lng,
    type: post.kind,
    chatKind: post.kind,
    title: post.title || post.text || `${post.kind} post`,
    description: post.text || "",
    images,
    locationLabel: post.hashtag || "#india",
    hashtags: tag ? [tag] : undefined,
    timestamp: post.created_at,
    author: post.author?.username,
    chatUrl: post.url,
    link: post.url,
  };
}

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
  const [chat, setChat] = useState<MapItem[]>([]);
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

      // Combined home chat = the aggregated #india feed (its own posts + all child localities').
      const chatP = fetch(API_PATHS.feedTimeline("india", undefined, 50) + "&aggregate=true", opts)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((p: FeedListResponse) => {
          const data = p.data ?? {};
          const posts: FeedPost[] = [...(data.pinned ?? []), ...(data.posts ?? [])];
          return posts.map(feedPostToItem);
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            trackError("api_load_error", String(err), "explorer_chat");
          }
          return [] as MapItem[];
        });

      const [issueItems, eventItems, chatItems] = await Promise.all([
        issuesP,
        eventsP,
        chatP,
      ]);
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
      // Chat: newest first (the API already returns newest-first; keep it explicit).
      chatItems.sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime(),
      );

      setIssues(issueItems);
      setEvents(eventItems);
      setChat(chatItems);
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, []);

  return { issues, events, chat, loading };
}
