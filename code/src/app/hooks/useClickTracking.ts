"use client";
import { useCallback } from 'react';
import { trackClick, EventCategory, trackExternalLink } from '../utils/analytics';

interface ClickTrackingOptions {
  category?: EventCategory;
  additionalParams?: Record<string, string | number | boolean | undefined>;
}

/**
 * Hook to create a trackable click handler
 */
export function useClickTracking() {
  const track = useCallback((
    elementName: string,
    category: EventCategory = EventCategory.USER_INTERACTION,
    additionalParams: Record<string, string | number | boolean | undefined> = {}
  ) => {
    trackClick(elementName, category, additionalParams);
  }, []);

  return track;
}

/**
 * Hook to track link clicks (internal and external)
 */
export function useLinkTracking() {
  const trackLinkClick = useCallback((
    href: string,
    linkText?: string,
    isExternal?: boolean
  ) => {
    // Auto-detect external links
    const isExternalLink = isExternal ?? (
      href.startsWith('http://') || 
      href.startsWith('https://') || 
      href.startsWith('//')
    );

    if (isExternalLink) {
      trackExternalLink(href, linkText);
    } else {
      trackClick(`Link: ${linkText || href}`, EventCategory.NAVIGATION, {
        destination: href,
      });
    }
  }, []);

  return trackLinkClick;
}

/**
 * Creates an analytics-aware click handler
 */
export function createTrackedClickHandler(
  elementName: string,
  onClick?: () => void,
  options: ClickTrackingOptions = {}
) {
  return () => {
    const { category = EventCategory.USER_INTERACTION, additionalParams = {} } = options;
    trackClick(elementName, category, additionalParams);
    onClick?.();
  };
}
