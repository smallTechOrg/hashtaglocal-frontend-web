"use client";
import React, { useEffect } from "react";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";
import { trackEvent, EventCategory } from "../utils/analytics";
import { useAnalytics } from "../context/AnalyticsContext";

declare global {
  interface Window {
    redirectToThankYou?: () => void;
  }
}

export default function Join() {
  // Analytics hooks
  useScrollTracking();
  useTimeTracking('/join');
  const { trackJourneyStep } = useAnalytics();

  useEffect(() => {
    // Track join page visit
    trackJourneyStep('join_page_visited');

    // Define the redirect function globally
    window.redirectToThankYou = function() {
      trackEvent('form_submission', {
        event_category: EventCategory.ENGAGEMENT,
        event_label: 'Join Movement Form Submitted',
        form_type: 'typeform',
        form_id: 'OI3uc4p3'
      });
      trackJourneyStep('join_form_submitted');
      window.location.href = "/";
    };

    // Load Typeform embed script
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    // Cleanup
    return () => {
      delete window.redirectToThankYou;
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [trackJourneyStep]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <h1 style={{ 
        fontSize: "2rem", 
        fontWeight: "500", 
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        Join The Movement
      </h1>
      <div 
        data-tf-widget="OI3uc4p3" 
        data-tf-on-submit="redirectToThankYou"
        style={{ width: "100%", maxWidth: "800px", height: "600px" }}
      ></div>
    </div>
  );
}
