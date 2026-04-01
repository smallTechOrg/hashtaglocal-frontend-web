import { Issue } from "./issue";

export interface TimelineEvent {
  event: string;
  timestamp: string;
  details?: string;
}

export interface IssueStory {
  issue: Issue;
  timeline: TimelineEvent[];
  resolution_days: number;
}

export interface IssueStoriesResponse {
  data?: {
    stories?: IssueStory[];
  };
}
