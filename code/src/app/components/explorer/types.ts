import { LayerId } from "./layerConfig";

export interface MapImage {
  url: string;
  thumbnail?: string;
}

/** A normalized marker shared by issues and events. */
export interface MapItem {
  layer: LayerId;
  id: string;
  lat: number;
  lng: number;
  /** Sub-filter category value, e.g. "POTHOLE" or "BEACH_CLEANUP". */
  type?: string;
  title: string;
  description: string;
  images: MapImage[];
  locationLabel: string;
  hashtags?: string[];
  /** ISO timestamp — created_at for issues, start_time for events. */
  timestamp?: string;
  /** Events only. */
  endTime?: string;
  organisation?: string;
  link?: string;
  /** Slug-based detail route, issues only. */
  detailHref?: string;
}
