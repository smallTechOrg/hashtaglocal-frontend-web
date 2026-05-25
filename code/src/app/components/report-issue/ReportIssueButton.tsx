"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, X } from "lucide-react";
import { getAccessToken, buildGoogleAuthUrl } from "../../ops/lib/auth";
import { GOOGLE_CLIENT_ID } from "../../ops/lib/constants";
import { setReportLocation } from "./reportStore";
import { reverseGeocode } from "../../utils/geocoding";

type Variant = "header" | "map-bottom" | "fab";

interface ReportIssueButtonProps {
  variant?: Variant;
}

export default function ReportIssueButton({ variant = "header" }: ReportIssueButtonProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  // Handle ?autoopen=report after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoopen") === "report") {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("autoopen");
      window.history.replaceState({}, "", clean.toString());
      handleOpen();
    }

    function checkPending() {
      if (sessionStorage.getItem("report_issue_pending")) {
        sessionStorage.removeItem("report_issue_pending");
        handleOpen();
      }
    }
    checkPending();
    window.addEventListener("pageshow", checkPending);
    return () => window.removeEventListener("pageshow", checkPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen() {
    setPermError(null);

    // 1. Auth check — redirect to Google sign-in if needed
    const token = getAccessToken();
    if (!token) {
      const returnTo = `${window.location.pathname}?autoopen=report`;
      sessionStorage.setItem("report_issue_return_to", returnTo);
      const redirectUri = `${window.location.origin}/auth/callback`;
      window.location.href = buildGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
      return;
    }

    setChecking(true);

    // 2. Camera permission
    let cameraStream: MediaStream;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStream.getTracks().forEach((t) => t.stop());
    } catch {
      setPermError("Camera access was denied. Camera permission is required to report an issue.");
      setChecking(false);
      return;
    }

    // 3. Location permission — also captures the position for the form
    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }),
      );
    } catch {
      setPermError("Location access was denied. Location permission is required to report an issue.");
      setChecking(false);
      return;
    }

    // Store location in the report store; reverse-geocode in background
    setReportLocation(position, null);
    reverseGeocode(position.coords.latitude, position.coords.longitude).then((meta) => {
      if (meta) setReportLocation(position, meta);
    });

    setChecking(false);
    router.push("/report");
  }

  const buttonLabel = checking ? "Checking…" : "Report Issue";

  return (
    <>
      {variant === "map-bottom" && (
        <button
          className="ri-map-bottom-btn"
          onClick={handleOpen}
          disabled={checking}
          aria-label="Report a community issue"
        >
          <TriangleAlert size={18} />
          <span className="ri-map-bottom-btn-content">
            <span className="ri-map-bottom-btn-main">{buttonLabel}</span>
            <span className="ri-map-bottom-btn-sub">Help make your neighbourhood better</span>
          </span>
        </button>
      )}

      {variant === "fab" && (
        <button
          className="ri-sticky-btn"
          onClick={handleOpen}
          disabled={checking}
          aria-label="Report a community issue"
        >
          <TriangleAlert size={16} />
          <span className="ri-sticky-label">{buttonLabel}</span>
        </button>
      )}

      {/* Inline permission error toast */}
      {permError && (
        <div className="ri-perm-toast" role="alert">
          <span className="ri-perm-toast-msg">{permError}</span>
          <button className="ri-perm-toast-close" onClick={() => setPermError(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
