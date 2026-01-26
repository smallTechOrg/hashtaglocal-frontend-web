"use client";
import { createContext, useContext, useEffect, ReactNode, Suspense } from 'react';
import { userJourney, trackPageView } from '../utils/analytics';
import { usePathname, useSearchParams } from 'next/navigation';

interface AnalyticsContextValue {
  trackJourneyStep: (step: string, data?: Record<string, string | number | boolean | undefined>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackJourneyStep: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

// Separate component that uses useSearchParams (requires Suspense)
function AnalyticsProviderContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views and journey
  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      trackPageView(url);
      userJourney.addStep('page_view', { path: pathname, url });
    }
  }, [pathname, searchParams]);

  // Track session end
  useEffect(() => {
    const handleBeforeUnload = () => {
      const duration = userJourney.getSessionDuration();
      if (duration > 1000) { // Only track if session > 1 second
        userJourney.addStep('session_end', { 
          duration_ms: duration,
          duration_seconds: Math.floor(duration / 1000)
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const trackJourneyStep = (step: string, data?: Record<string, string | number | boolean | undefined>) => {
    userJourney.addStep(step, data);
  };

  return (
    <AnalyticsContext.Provider value={{ trackJourneyStep }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AnalyticsProviderContent>{children}</AnalyticsProviderContent>
    </Suspense>
  );
}
