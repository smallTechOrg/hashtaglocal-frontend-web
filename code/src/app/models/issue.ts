export enum IssueStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  ONHOLD = "ONHOLD",
  REJECTED = "REJECTED",
}

export enum IssueType {
  POTHOLE = "POTHOLE",
  WASTE = "WASTE",
  FOOTPATH = "FOOTPATH",
  POLLUTION = "POLLUTION",
  HYGIENE = "HYGIENE",
  SAFETY = "SAFETY",
  OTHER = "OTHER",
}

export interface UpdateIssueRequest {
  status?: string;
  type?: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface Issue {
  id: number;
  user?: {
    username?: string;
    profile_photo?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
    colloquial_name?: string;
    locality?: {
      hashtags?: string[];
    };
  };
  type?: string;
  description?: string;
  created_at?: string;
  media_urls?: Array<{
    type?: string;
    url?: string;
  }>;
  vote_count?: number;
  verify_count?: number;
  status?: string;
  rank?: number;
}
