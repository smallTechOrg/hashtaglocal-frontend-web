/** A scraped event as returned by the admin event endpoints */
export interface AdminEvent {
  id: number;
  name: string;
  display_name: string | null;
  organisation: string | null;
  portal: string | null;
  type: string | null;
  start_time: string;
  end_time: string | null;
  location: {
    lat: number;
    lng: number;
    name: string;
    locality: { hashtags: string[] } | null;
  } | null;
  address: string;
  link: string;
  image_url: string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | null;
}

/** A recently reviewed (approved or rejected) action */
export interface ReviewedAction {
  action_id: number;
  issue_id: number;
  submitted_by_user_id: number;
  submitted_by_username: string;
  action: "REPORT" | "VERIFY" | "RESOLVE";
  approval_status: "APPROVED" | "REJECTED";
  created_at: string;
  approved_at: string | null;
  approved_by_username: string | null;
}

/** Mirrors IssueActionAdminResponseData from the backend */
export interface PendingAction {
  action_id: number;
  issue_id: number;
  submitted_by_user_id: number;
  submitted_by_username: string;
  action: "REPORT" | "VERIFY" | "RESOLVE";
  approval_status: string;
  created_at: string;
}

/** The issue detail fetched for the review card */
export interface AdminIssueDetail {
  id: number;
  description: string;
  type: string;
  status: string;
  created_at: string;
  user: {
    username: string;
    profile_photo: string | null;
  };
  location: {
    lat: number;
    lng: number;
    address: string;
    colloquial_name: string;
    locality: {
      hashtags: string[];
    };
  };
  media_urls: {
    url: string;
    url_thumbnail: string;
    type: string;
    description: string | null;
  }[];
  verify_count: number;
  vote_count: number;
  viewer_context?: {
    upvote: boolean;
    is_owner: boolean;
  };
}

/** User issue statistics from admin/user/{id}/summary */
export interface UserSummary {
  issue_count: {
    total: number;
    onhold: number;
    open: number;
    resolved: number;
    verify: number;
    resolved_others: number;
  };
}

export interface GovPortalReportFormValues {
  source: "GOV_ISSUE_PORTAL";
  type: "REPORT_ISSUE";
  portal: string;
  category: string;
  subCategory: string;
  description: string;
  mediaUrl: string;
  latitude: string;
  longitude: string;
  username: string;
  password: string;
}

export type GovPortalDecision = "YES" | "NO";

export interface ReportComplaintPayload {
  source: "GOV_ISSUE_PORTAL" | "GOV_ISSUE_PORTAL";
  context: {
    portal: string;
    action: {
      type: "REPORT_ISSUE";
      data: {
        category: string;
        sub_category: string;
        description: string;
        media_url: string;
        latitude: string;
        longitude: string;
      };
    };
    auth: {
      username: string;
      password: string;
    };
  };
}

export interface ReportComplaintResponse {
  data?: {
    tracking_id?: number;
  };
}

/** State transition info shown to admin */
export interface TransitionInfo {
  action: string;
  approve: { label: string; fromStatus: string; toStatus: string };
  reject: { label: string; fromStatus: string; toStatus: string };
}

/** Map action type + current issue status to state transitions */
export function getTransitionInfo(
  actionType: string,
  currentIssueStatus: string,
): TransitionInfo {
  switch (actionType) {
    case "REPORT":
      return {
        action: "REPORT",
        approve: {
          label: "Issue goes live",
          fromStatus: "ONHOLD",
          toStatus: "OPEN",
        },
        reject: {
          label: "Issue rejected",
          fromStatus: "ONHOLD",
          toStatus: "REJECTED",
        },
      };
    case "VERIFY":
      return {
        action: "VERIFY",
        approve: {
          label: "Verification counted",
          fromStatus: currentIssueStatus,
          toStatus: currentIssueStatus,
        },
        reject: {
          label: "Verification discarded",
          fromStatus: currentIssueStatus,
          toStatus: currentIssueStatus,
        },
      };
    case "RESOLVE":
      return {
        action: "RESOLVE",
        approve: {
          label: "Issue resolved",
          fromStatus: "PENDING",
          toStatus: "RESOLVED",
        },
        reject: {
          label: "Issue reopened",
          fromStatus: "PENDING",
          toStatus: "OPEN",
        },
      };
    default:
      return {
        action: actionType,
        approve: {
          label: "Approve",
          fromStatus: currentIssueStatus,
          toStatus: "?",
        },
        reject: {
          label: "Reject",
          fromStatus: currentIssueStatus,
          toStatus: "?",
        },
      };
  }
}
