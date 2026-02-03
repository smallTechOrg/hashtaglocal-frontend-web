"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";
import { useAnalytics } from "../context/AnalyticsContext";

export default function Join() {
  // Analytics hooks
  useScrollTracking();
  useTimeTracking('/join');
  const { trackJourneyStep } = useAnalytics();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const loadCountRef = useRef(0);

  useEffect(() => {
    // Track join page visit
    trackJourneyStep('join_page_visited');
  }, [trackJourneyStep]);

  const handleFormLoad = () => {
    loadCountRef.current += 1;
    if (loadCountRef.current > 1 && !isSubmitted) {
      setIsSubmitted(true);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "1rem",
      paddingTop: "1.5rem"
    }}>
      <h1 style={{ 
        fontSize: "clamp(1.25rem, 5vw, 1.75rem)", 
        fontWeight: "500", 
        marginBottom: "1rem",
        textAlign: "center"
      }}>
        Join The Movement
      </h1>
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLSdDjs6xd3nyzJKWtF3DEk1uQPnqVlpfYv8Ibnp8gZbRV5RV0Q/viewform?embedded=true"
        title="Join The Movement"
        style={{
          width: "100%",
          maxWidth: "800px",
          height: isSubmitted ? "clamp(260px, 40vh, 420px)" : "clamp(500px, 75vh, 900px)",
          border: 0,
        }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleFormLoad}
      />
      <Link
        href="/"
        style={{
          marginTop: "1rem",
          textDecoration: "none",
          color: "#111827",
          border: "1px solid #e5e7eb",
          padding: "0.5rem 1rem",
          borderRadius: "999px",
          fontSize: "0.95rem",
          fontWeight: 500,
          background: "#ffffff",
        }}
        aria-label="Back to Home"
      >
        Back to Home
      </Link>
    </div>
  );
}
