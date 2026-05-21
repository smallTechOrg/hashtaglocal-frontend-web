import { IssueType } from "../../models/issue";
import { EventType } from "../../models/event";

export type LayerId = "issues" | "events";

export interface SubFilter {
  value: string;
  label: string;
  icon: string;
}

export interface LayerDef {
  id: LayerId;
  label: string;
  icon: string;
  /** Marker color for this layer. */
  color: string;
  subFilters: SubFilter[];
}

export const ISSUE_SUBFILTERS: SubFilter[] = [
  { value: IssueType.POTHOLE, label: "Potholes", icon: "🕳️" },
  { value: IssueType.WASTE, label: "Waste", icon: "🗑️" },
  { value: IssueType.FOOTPATH, label: "Footpaths", icon: "🚶" },
  { value: IssueType.POLLUTION, label: "Pollution", icon: "🌫️" },
  { value: IssueType.HYGIENE, label: "Hygiene", icon: "🧼" },
  { value: IssueType.SAFETY, label: "Safety", icon: "🛡️" },
  { value: IssueType.OTHER, label: "Other", icon: "📌" },
];

export const EVENT_SUBFILTERS: SubFilter[] = [
  { value: EventType.CLEANLINESS_DRIVE, label: "Cleanliness", icon: "🧹" },
  { value: EventType.BEACH_CLEANUP, label: "Beach cleanup", icon: "🏖️" },
  { value: EventType.ROAD_CLEANUP, label: "Road cleanup", icon: "🛣️" },
  { value: EventType.FOREST_CLEANUP, label: "Forest cleanup", icon: "🌲" },
  { value: EventType.TREEPLANTATION, label: "Tree plantation", icon: "🌱" },
  { value: EventType.TREKANDPLOG, label: "Trek & plog", icon: "🥾" },
  { value: EventType.VOLUNTEERING, label: "Volunteering", icon: "🤝" },
  { value: EventType.WORKSHOP, label: "Workshop", icon: "🎓" },
  { value: EventType.OTHER, label: "Other", icon: "📌" },
];

export const LAYERS: LayerDef[] = [
  {
    id: "issues",
    label: "Issues",
    icon: "⚠️",
    color: "#FF5A4E",
    subFilters: ISSUE_SUBFILTERS,
  },
  {
    id: "events",
    label: "Events",
    icon: "📅",
    color: "#6366F1",
    subFilters: EVENT_SUBFILTERS,
  },
];

export const LAYER_BY_ID: Record<LayerId, LayerDef> = {
  issues: LAYERS[0],
  events: LAYERS[1],
};

export const normalizeType = (type?: string) =>
  type ? type.toUpperCase() : "OTHER";

export const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const formatEventDate = (dateString?: string) => {
  if (!dateString) return "Date TBA";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatEventTime = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const isUpcoming = (dateString?: string) => {
  if (!dateString) return true;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= Date.now() - 12 * 60 * 60 * 1000;
};

export const prettyType = (type?: string) =>
  (type || "OTHER")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
