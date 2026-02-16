/**
 * Analytics Utility
 * Comprehensive tracking system for Google Analytics
 */

export enum EventCategory {
  USER_INTERACTION = 'user_interaction',
  NAVIGATION = 'navigation',
  ISSUE = 'issue',
  FILTER = 'filter',
  ENGAGEMENT = 'engagement',
  ERROR = 'error',
  PERFORMANCE = 'performance',
}

export enum EventAction {
  // Navigation
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  SCROLL = 'scroll',
  
  // Issue actions
  ISSUE_VIEW = 'issue_view',
  ISSUE_FILTER = 'issue_filter',
  ISSUE_EDIT = 'issue_edit',
  ISSUE_SHARE = 'issue_share',
  ISSUE_MEDIA_VIEW = 'issue_media_view',
  
  // Dashboard actions
  MAP_INTERACTION = 'map_interaction',
  MAP_MARKER_CLICK = 'map_marker_click',
  MAP_ZOOM = 'map_zoom',
  MAP_PAN = 'map_pan',
  
  // Filter actions
  FILTER_CHANGE = 'filter_change',
  STATUS_FILTER = 'status_filter',
  TYPE_FILTER = 'type_filter',
  HASHTAG_FILTER = 'hashtag_filter',
  
  // Engagement
  SCROLL_DEPTH = 'scroll_depth',
  TIME_ON_PAGE = 'time_on_page',
  EXTERNAL_LINK_CLICK = 'external_link_click',
  
  // Invite
  INVITE_OPEN = 'invite_open',
  
  // Errors
  API_ERROR = 'api_error',
  LOAD_ERROR = 'load_error',
}

interface AnalyticsEventParams extends Record<string, string | number | boolean | undefined> {
  event_category?: EventCategory;
  event_label?: string;
  value?: number;
}

/**
 * Track a custom event
 */
export function trackEvent(
  action: EventAction | string,
  params: AnalyticsEventParams = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not initialized');
    return;
  }

  try {
    window.gtag('event', action, {
      ...params,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Track page views
 */
export function trackPageView(url: string, title?: string): void {
  trackEvent(EventAction.PAGE_VIEW, {
    event_category: EventCategory.NAVIGATION,
    page_path: url,
    page_title: title || document.title,
  });
}

/**
 * Track click events
 */
export function trackClick(
  elementName: string,
  category: EventCategory = EventCategory.USER_INTERACTION,
  additionalParams: Record<string, string | number | boolean | undefined> = {}
): void {
  trackEvent(EventAction.CLICK, {
    event_category: category,
    event_label: elementName,
    ...additionalParams,
  });
}

/**
 * Track scroll depth
 */
export function trackScroll(depth: number): void {
  trackEvent(EventAction.SCROLL_DEPTH, {
    event_category: EventCategory.ENGAGEMENT,
    event_label: `${depth}%`,
    value: depth,
  });
}

/**
 * Track issue-related events
 */
export function trackIssueView(issueId: string | number, issueType?: string): void {
  trackEvent(EventAction.ISSUE_VIEW, {
    event_category: EventCategory.ISSUE,
    event_label: `Issue ${issueId}`,
    issue_id: issueId,
    issue_type: issueType,
  });
}

export function trackIssueFilter(filterType: string, filterValue: string): void {
  trackEvent(EventAction.ISSUE_FILTER, {
    event_category: EventCategory.FILTER,
    event_label: `${filterType}: ${filterValue}`,
    filter_type: filterType,
    filter_value: filterValue,
  });
}

export function trackIssueEdit(issueId: string | number): void {
  trackEvent(EventAction.ISSUE_EDIT, {
    event_category: EventCategory.ISSUE,
    event_label: `Edit Issue ${issueId}`,
    issue_id: issueId,
  });
}

export function trackIssueShare(issueId: string | number, method: string = 'copy_link'): void {
  trackEvent(EventAction.ISSUE_SHARE, {
    event_category: EventCategory.ISSUE,
    event_label: `Share Issue ${issueId}`,
    issue_id: issueId,
    share_method: method,
  });
}

/**
 * Track map interactions
 */
export function trackMapInteraction(interactionType: string, details?: Record<string, string | number | boolean | undefined>): void {
  trackEvent(EventAction.MAP_INTERACTION, {
    event_category: EventCategory.USER_INTERACTION,
    event_label: interactionType,
    ...details,
  });
}

export function trackMapMarkerClick(issueId: string | number, issueType?: string): void {
  trackEvent(EventAction.MAP_MARKER_CLICK, {
    event_category: EventCategory.USER_INTERACTION,
    event_label: `Marker ${issueId}`,
    issue_id: issueId,
    issue_type: issueType,
  });
}

/**
 * Track errors
 */
export function trackError(errorType: string, errorMessage: string, context?: string): void {
  trackEvent(EventAction.API_ERROR, {
    event_category: EventCategory.ERROR,
    event_label: errorType,
    error_message: errorMessage,
    error_context: context,
  });
}

/**
 * Track time on page
 */
export function trackTimeOnPage(duration: number, pagePath: string): void {
  trackEvent(EventAction.TIME_ON_PAGE, {
    event_category: EventCategory.ENGAGEMENT,
    event_label: pagePath,
    value: duration,
    duration_seconds: duration,
  });
}

/**
 * Track external link clicks
 */
export function trackExternalLink(url: string, linkText?: string): void {
  trackEvent(EventAction.EXTERNAL_LINK_CLICK, {
    event_category: EventCategory.USER_INTERACTION,
    event_label: linkText || url,
    external_url: url,
  });
}

/**
 * User journey tracking
 */
export interface UserJourneyStep {
  step: string;
  timestamp: number;
  data?: Record<string, string | number | boolean | undefined>;
}

class UserJourney {
  private steps: UserJourneyStep[] = [];
  private sessionStart: number = Date.now();

  addStep(step: string, data?: Record<string, string | number | boolean | undefined>): void {
    const journeyStep: UserJourneyStep = {
      step,
      timestamp: Date.now(),
      data,
    };
    
    this.steps.push(journeyStep);
    
    // Track step in GA
    trackEvent('journey_step', {
      event_category: EventCategory.NAVIGATION,
      event_label: step,
      step_number: this.steps.length,
      time_from_start: Date.now() - this.sessionStart,
      ...data,
    });
  }

  getJourney(): UserJourneyStep[] {
    return [...this.steps];
  }

  reset(): void {
    this.steps = [];
    this.sessionStart = Date.now();
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStart;
  }
}

export const userJourney = new UserJourney();

// Declare gtag on window
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: Record<string, string | number | boolean | undefined>
    ) => void;
    dataLayer: Array<Record<string, unknown>>;
  }
}
