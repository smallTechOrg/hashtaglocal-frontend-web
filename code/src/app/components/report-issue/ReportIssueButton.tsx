"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [showSignIn, setShowSignIn] = useState(false);
  const pendingPosition = useRef<GeolocationPosition | null>(null);

  // Handle ?autoopen=report after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoopen") === "report") {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("autoopen");
      window.history.replaceState({}, "", clean.toString());

      // Permissions were already checked before the OAuth redirect — skip straight to /report
      if (sessionStorage.getItem("report_perms_granted")) {
        sessionStorage.removeItem("report_perms_granted");
        router.push("/report");
        return;
      }

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
    setChecking(true);

    // 1. Camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setPermError("Camera access was denied. Camera permission is required to report an issue.");
      setChecking(false);
      return;
    }

    // 2. Location permission — also captures the position for the form
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

    setChecking(false);

    // 3. Auth check — ask user to sign in if needed
    const token = getAccessToken();
    if (!token) {
      pendingPosition.current = position;
      setShowSignIn(true);
      return;
    }

    // Store location and proceed
    commitLocation(position);
    router.push("/report");
  }

  function commitLocation(position: GeolocationPosition) {
    setReportLocation(position, null);
    reverseGeocode(position.coords.latitude, position.coords.longitude).then((meta) => {
      if (meta) setReportLocation(position, meta);
    });
  }

  function handleSignIn() {
    if (pendingPosition.current) {
      commitLocation(pendingPosition.current);
    }
    sessionStorage.setItem("report_perms_granted", "1");
    const returnTo = `${window.location.pathname}?autoopen=report`;
    sessionStorage.setItem("report_issue_return_to", returnTo);
    // Mark this sign-in as the report flow so the callback re-opens the report modal.
    sessionStorage.setItem("report_issue_pending_intent", "1");
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = buildGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
  }

  const buttonLabel = checking ? "Checking for Camera and Location…" : "Report Issue In Your Locality";

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

      {/* Sign-in bottom sheet — portalled to body to escape stacking context */}
      {showSignIn && createPortal(
        <div className="ri-overlay ri-overlay--centered" role="dialog" aria-modal="true" aria-label="Sign in required">
          <div className="ri-modal ri-signin-sheet">
            <div className="ri-signin-handle" />
            <button
              className="ri-close-btn ri-signin-close"
              onClick={() => setShowSignIn(false)}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>

            <div className="ri-signin-body">
              {/* <div className="ri-signin-icon" aria-hidden="true">🔐</div> */}
              <h2 className="ri-signin-title">Sign in to continue</h2>
              <p className="ri-signin-desc">
                You need an account to submit a community issue. Your report helps neighbours and local authorities act faster.
              </p>

              <button className="ri-google-btn" onClick={handleSignIn}>
                <svg className="ri-google-logo" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              {/* <p className="ri-signin-hint">
                Free to join · Takes 10 seconds
              </p> */}
            </div>
          </div>
        </div>,
        document.body
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
