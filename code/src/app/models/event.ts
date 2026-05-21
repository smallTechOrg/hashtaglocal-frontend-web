export enum EventType {
  CLEANLINESS_DRIVE = "CLEANLINESS_DRIVE",
  BEACH_CLEANUP = "BEACH_CLEANUP",
  ROAD_CLEANUP = "ROAD_CLEANUP",
  FOREST_CLEANUP = "FOREST_CLEANUP",
  TREEPLANTATION = "TREEPLANTATION",
  TREKANDPLOG = "TREKANDPLOG",
  VOLUNTEERING = "VOLUNTEERING",
  WORKSHOP = "WORKSHOP",
  OTHER = "OTHER",
}

export interface EventLocation {
  lat?: number;
  lng?: number;
  name?: string;
  locality?: {
    hashtags?: string[];
  };
}

/** Shape of a single event as returned by GET /api/v1/events (snake_case JSON). */
export interface ApiEvent {
  id: number;
  name: string;
  organisation?: string;
  image_url?: string;
  portal?: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  location?: EventLocation;
  address?: string;
  link?: string;
  meta_data?: Record<string, unknown>;
}

export interface EventsResponse {
  data?: {
    events?: ApiEvent[];
  };
}
