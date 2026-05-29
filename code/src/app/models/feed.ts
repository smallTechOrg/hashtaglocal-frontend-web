/** Shapes returned by the feed API (snake_case JSON). Mirrors backend FEED_DESIGN.md §5. */

export type FeedPostKind =
  | "TEXT"
  | "MEDIA"
  | "LINK"
  | "ISSUE_REF"
  | "EVENT_REF"
  | "BULLETIN"
  | "POLL"
  | "QUIZ";

export type FeedPostStatus =
  | "PENDING_AI"
  | "PUBLISHED"
  | "FLAGGED"
  | "AI_BLOCKED"
  | "ADMIN_HIDDEN";

export interface FeedAuthor {
  id: number;
  username?: string;
  profile_picture?: string;
}

export interface FeedViewerContext {
  is_author?: boolean;
  voted?: boolean;
  answered?: boolean;
}

/** A single feed post. Only the fields meaningful for `kind` are populated. */
export interface FeedPost {
  id: number;
  kind: FeedPostKind;
  status: FeedPostStatus;
  hashtag?: string;
  pinned: boolean;
  author?: FeedAuthor;
  text?: string;
  created_at?: string;

  // LINK
  url?: string;
  title?: string;
  image_url?: string;
  embed_html?: string;
  embed_type?: string;
  scrape_status?: string;

  // MEDIA
  media_url?: string;
  media_type?: string;

  // references
  issue_id?: number;
  event_id?: number;

  data?: Record<string, unknown>;
  viewer_context?: FeedViewerContext;
}

export interface FeedListResponse {
  data?: {
    pinned?: FeedPost[];
    posts?: FeedPost[];
    next_cursor?: string | null;
  };
}

/** Request body for POST /api/v1/feed. */
export interface CreateFeedPostRequest {
  kind: FeedPostKind;
  lat?: number;
  lng?: number;
  hashtag?: string;
  text?: string;
  link_url?: string;
  media_id?: number;
  issue_id?: number;
  event_id?: number;
}

// --- Admin moderation queue (GET /admin/feed/moderation) ---

export interface ModerationQueueItem {
  post: FeedPost;
  ai_verdict?: string;
  ai_category?: string;
  ai_confidence?: number;
  ai_reason?: string;
  ai_model?: string;
  evaluated_at?: string;
  admin_action?: string;
}

export interface ModerationQueueResponse {
  data?: {
    items?: ModerationQueueItem[];
    next_cursor?: string | null;
  };
}
