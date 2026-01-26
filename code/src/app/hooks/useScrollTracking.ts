"use client";
import { useEffect, useRef } from 'react';
import { trackScroll } from '../utils/analytics';

interface ScrollTrackingOptions {
  thresholds?: number[]; // Percentage thresholds to track (default: [25, 50, 75, 90, 100])
  throttleMs?: number; // Throttle time in milliseconds (default: 500)
}

/**
 * Hook to track scroll depth on a page
 */
export function useScrollTracking(options: ScrollTrackingOptions = {}) {
  const {
    thresholds = [25, 50, 75, 90, 100],
    throttleMs = 500,
  } = options;

  const trackedThresholds = useRef<Set<number>>(new Set());
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset tracked thresholds when component mounts
    trackedThresholds.current = new Set();

    const handleScroll = () => {
      if (throttleTimeout.current) return;

      throttleTimeout.current = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        const scrollPercentage = Math.round(
          ((scrollTop + windowHeight) / documentHeight) * 100
        );

        // Check which thresholds have been reached
        thresholds.forEach((threshold) => {
          if (scrollPercentage >= threshold && !trackedThresholds.current.has(threshold)) {
            trackedThresholds.current.add(threshold);
            trackScroll(threshold);
          }
        });

        throttleTimeout.current = null;
      }, throttleMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, [thresholds, throttleMs]);
}

/**
 * Hook to track time spent on page
 */
export function useTimeTracking(pagePath?: string) {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      if (timeSpent > 1) { // Only track if > 1 second
        import('../utils/analytics').then(({ trackTimeOnPage }) => {
          trackTimeOnPage(timeSpent, pagePath || window.location.pathname);
        });
      }
    };
  }, [pagePath]);
}
