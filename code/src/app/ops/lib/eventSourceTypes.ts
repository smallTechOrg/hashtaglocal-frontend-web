// Types for the /admin/event-sources API (snake_case, like the rest of the backend). An event
// source is one scraper0 site + read action that the event ingestion job reads on a schedule.
// Sites are onboarded (and their actions learned and locked) in scraper0 first; this page only
// picks from what scraper0 already serves.

export type EventSourceRunStatus = "ok" | "partial" | "error";

/** Body of POST /admin/event-sources and PUT /admin/event-sources/{id}. */
export interface EventSourceInput {
  name: string;
  site_id: string;
  /** scraper0 read action; "fetch_events" unless the site names it differently. */
  action: string;
  event_filter: string | null;
  category_filter: string | null;
  include_online: boolean;
  freshness_hours: number;
  enabled: boolean;
}

export interface EventSource extends EventSourceInput {
  id: number;
  last_run_at: string | null;
  last_status: EventSourceRunStatus | null;
  last_error: string | null;
  last_item_count: number | null;
  last_imported_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Scraper0SiteAction {
  name: string;
  kind: "read" | "write" | string;
  status: "draft" | "locked" | "broken" | string;
}

/** One row of GET /admin/event-sources/scraper0-sites (proxied from scraper0 GET /v2/sites). */
export interface Scraper0Site {
  site_id: string;
  base_url: string;
  name: string;
  actions: Scraper0SiteAction[];
}

export interface EventSourceTestItem {
  id: string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  link: string | null;
  image: string | null;
  category: string | null;
  is_online: boolean | null;
}

/** POST /admin/event-sources/{id}/test: a live read; nothing is imported. Items are the first 20. */
export interface EventSourceTestResult {
  item_count: number;
  complete: boolean;
  scraped_at: string | null;
  health: unknown;
  ai_error: string | null;
  items: EventSourceTestItem[];
}

export const DEFAULT_ACTION = "fetch_events";
export const DEFAULT_FRESHNESS_HOURS = 48;

/** Read actions that are locked: the only ones the ingestion job can call. */
export function lockedReadActions(site: Scraper0Site): string[] {
  return (site.actions ?? [])
    .filter((a) => a.kind === "read" && a.status === "locked")
    .map((a) => a.name);
}
