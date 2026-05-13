"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Camera,
  RotateCcw,
  Send,
  AlertCircle,
  CheckCircle,
  MapPin,
  Loader2,
  SwitchCamera,
} from "lucide-react";
import { getAccessToken, buildGoogleAuthUrl } from "../../ops/lib/auth";
import { API_PATHS } from "../../constants/api";
import { GOOGLE_CLIENT_ID } from "../../ops/lib/constants";

type Step =
  | "checking-auth"
  | "unauthenticated"
  | "requesting-perms"
  | "perms-denied"
  | "form"
  | "captured"
  | "submitting"
  | "success"
  | "error";

type IssueType =
  | "POTHOLE"
  | "WASTE"
  | "FOOTPATH"
  | "POLLUTION"
  | "HYGIENE"
  | "SAFETY"
  | "OTHER";

const ISSUE_TYPES: { value: IssueType; label: string; emoji: string }[] = [
  { value: "POTHOLE", label: "Pothole", emoji: "🕳️" },
  { value: "WASTE", label: "Waste", emoji: "🗑️" },
  { value: "FOOTPATH", label: "Footpath", emoji: "🚶" },
  { value: "POLLUTION", label: "Pollution", emoji: "💨" },
  { value: "HYGIENE", label: "Hygiene", emoji: "🧹" },
  { value: "SAFETY", label: "Safety", emoji: "⚠️" },
  { value: "OTHER", label: "Other", emoji: "📌" },
];

interface ReportIssueModalProps {
  onClose: () => void;
}

export default function ReportIssueModal({ onClose }: ReportIssueModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking-auth");
  const [issueType, setIssueType] = useState<IssueType>("POTHOLE");
  const [description, setDescription] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitStage, setSubmitStage] = useState<0 | 1 | 2 | 3>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check auth on mount — directly kick off permissions if already signed in
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      requestPermissions();
    } else {
      setStep("unauthenticated");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCameraStream(facing: "environment" | "user"): Promise<MediaStream> {
    stopStream();
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch {
      // Fallback: request any camera without constraints
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  const requestPermissions = useCallback(async () => {
    setStep("requesting-perms");

    let stream: MediaStream;
    try {
      stream = await startCameraStream(facingMode);
    } catch {
      setErrorMsg("Camera access was denied. Camera permission is required to report an issue.");
      setStep("perms-denied");
      return;
    }

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setErrorMsg("Location access was denied. Location permission is required to report an issue.");
      setStep("perms-denied");
      return;
    }

    streamRef.current = stream;
    setLocation(position);
    setStep("form");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Attach stream to video element when entering the form step
  useEffect(() => {
    if (step === "form" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);



  async function switchCamera() {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    try {
      const stream = await startCameraStream(newFacing);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setErrorMsg("Could not switch camera.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreviewUrl(url);
        setStep("captured");
      },
      "image/jpeg",
      0.9,
    );
  }

  function retakePhoto() {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setCapturedBlob(null);
    setStep("requesting-perms");
    requestPermissions();
  }

  async function handleSubmit() {
    if (!capturedBlob || !location) return;

    const token = getAccessToken();
    if (!token) {
      setStep("unauthenticated");
      return;
    }

    setSubmitStage(1);
    setStep("submitting");

    try {
      // Step 1: Get signed upload URL
      const uploadUrlRes = await fetch(API_PATHS.mediaUploadUrl("image/jpeg"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!uploadUrlRes.ok) throw new Error("Failed to get upload URL");

      const uploadUrlData = await uploadUrlRes.json();
      const { signed_url: signedUrl, path } = uploadUrlData.data.media_url as {
        signed_url: string;
        path: string;
      };

      setSubmitStage(2);

      // Step 2: Upload image to Cloud Storage (no auth header on signed URL PUT)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: capturedBlob,
        headers: { "Content-Type": "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload photo");

      setSubmitStage(3);

      // Step 3: Submit the issue
      const { latitude, longitude, accuracy } = location.coords;
      const locationPayload = {
        lat: latitude,
        lng: longitude,
        meta_data: {
          accuracy,
          timestamp: location.timestamp,
        },
      };

      const issueRes = await fetch(API_PATHS.reportIssue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issue: {
            type: issueType,
            ...(description.trim() ? { description: description.trim() } : {}),
            location: locationPayload,
            media_urls: [
              {
                type: "PHOTO",
                url: path,
                location: locationPayload,
              },
            ],
          },
        }),
      });

      if (!issueRes.ok) throw new Error("Failed to submit issue");

      const issueData = await issueRes.json();
      const newIssueId: number | undefined = issueData?.data?.issue_id;

      stopStream();
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
      onClose();
      if (newIssueId) {
        router.push(`/issue/${newIssueId}?new=1`);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setStep("error");
    }
  }

  function handleGoogleSignIn() {
    // Remember current page so the callback can return here
    sessionStorage.setItem("report_issue_return_to", window.location.pathname);
    const redirectUri = `${window.location.origin}/auth/callback`;
    const url = buildGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
    window.location.href = url;
  }

  function handleClose() {
    stopStream();
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    onClose();
  }

  const isCamera = step === "form" || step === "captured";

  return (
    <div
      className="ri-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Report an Issue"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="ri-modal">
        {/* Header */}
        <div className="ri-header">
          <h2 className="ri-title">Report an Issue</h2>
          <button onClick={handleClose} className="ri-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ri-body">
          {/* Auth check */}
          {step === "checking-auth" && (
            <div className="ri-center-state">
              <Loader2 className="ri-icon-spin ri-icon-green" size={32} />
            </div>
          )}

          {/* Unauthenticated */}
          {step === "unauthenticated" && (
            <div className="ri-center-state">
              <p className="ri-state-title">Sign in to report</p>
              <p className="ri-state-desc">
                Sign in with Google to submit an issue report to your community.
              </p>
              <button onClick={handleGoogleSignIn} className="ri-primary-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
              <p className="ri-hint">You&apos;ll be returned here after signing in.</p>
            </div>
          )}

          {/* Requesting permissions */}
          {step === "requesting-perms" && (
            <div className="ri-center-state">
              <Loader2 className="ri-icon-spin ri-icon-green" size={32} />
              <p className="ri-state-title">Looking for access…</p>
              <p className="ri-state-desc">
                Please allow camera and location access.
              </p>
            </div>
          )}

          {/* Permissions denied */}
          {step === "perms-denied" && (
            <div className="ri-center-state">
              <AlertCircle size={44} className="ri-icon-red" />
              <p className="ri-state-title">Permission required</p>
              <p className="ri-state-desc">{errorMsg}</p>
              <button onClick={requestPermissions} className="ri-primary-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Camera + Form (form & captured steps) */}
          {isCamera && (
            <>
              {/* Camera / Preview area */}
              <div className="ri-camera-container">
                {step === "form" ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="ri-camera-view"
                    />
                    <div className="ri-camera-controls">
                      <button
                        onClick={switchCamera}
                        className="ri-icon-btn"
                        aria-label="Switch camera"
                        title="Switch camera"
                      >
                        <SwitchCamera size={17} />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="ri-capture-btn"
                        aria-label="Take photo"
                      >
                        <Camera size={24} />
                      </button>
                      <div className="ri-camera-spacer" />
                    </div>
                  </>
                ) : (
                  <>
                    {capturedPreviewUrl && (
                      <img
                        src={capturedPreviewUrl}
                        alt="Captured photo preview"
                        className="ri-camera-view"
                      />
                    )}
                    <div className="ri-camera-controls">
                      <button
                        onClick={retakePhoto}
                        className="ri-icon-btn"
                        aria-label="Retake photo"
                        title="Retake photo"
                      >
                        <RotateCcw size={17} />
                      </button>
                      <span className="ri-captured-badge">✓ Photo captured</span>
                      <div className="ri-camera-spacer" />
                    </div>
                  </>
                )}
              </div>

              {/* Form fields */}
              <div className="ri-form-fields">
                {/* Location badge */}
                {location && (
                  <div className="ri-location-badge">
                    <MapPin size={13} />
                    <span>
                      Location captured &nbsp;·&nbsp;{location.coords.accuracy.toFixed(0)} m accuracy
                    </span>
                  </div>
                )}

                {/* Issue type */}
                <div className="ri-field">
                  <label className="ri-label">Issue Type</label>
                  <div className="ri-type-grid">
                    {ISSUE_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setIssueType(t.value)}
                        className={`ri-type-btn${issueType === t.value ? " selected" : ""}`}
                      >
                        <span className="ri-type-emoji">{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="ri-field">
                  <label className="ri-label">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the issue…"
                    className="ri-textarea"
                    rows={2}
                    maxLength={500}
                  />
                </div>

                {/* Actions */}
                {step === "captured" ? (
                  <button onClick={handleSubmit} className="ri-submit-btn">
                    <Send size={15} />
                    Submit Report
                  </button>
                ) : (
                  <p className="ri-hint ri-hint-center">Take a photo to continue</p>
                )}
              </div>
            </>
          )}

          {/* Submitting */}
          {step === "submitting" && (
            <div className="ri-center-state">
              <Loader2 className="ri-icon-spin ri-icon-green" size={32} />
              <p className="ri-state-title">
                {submitStage === 1 && "Preparing upload…"}
                {submitStage === 2 && "Uploading photo…"}
                {submitStage === 3 && "Submitting report…"}
              </p>
              <div className="ri-progress-steps">
                <div className={`ri-progress-step${submitStage > 1 ? " done" : submitStage === 1 ? " active" : ""}`}>
                  <span className="ri-progress-dot" />
                  Prepare
                </div>
                <div className={`ri-progress-step${submitStage > 2 ? " done" : submitStage === 2 ? " active" : ""}`}>
                  <span className="ri-progress-dot" />
                  Upload photo
                </div>
                <div className={`ri-progress-step${submitStage > 3 ? " done" : submitStage === 3 ? " active" : ""}`}>
                  <span className="ri-progress-dot" />
                  Submit
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="ri-center-state">
              <CheckCircle size={52} className="ri-icon-green" />
              <p className="ri-state-title">Report submitted!</p>
              <p className="ri-state-desc">
                Thank you for helping improve your community.
              </p>
              <button onClick={handleClose} className="ri-primary-btn">
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="ri-center-state">
              <AlertCircle size={44} className="ri-icon-red" />
              <p className="ri-state-title">Something went wrong</p>
              <p className="ri-state-desc">{errorMsg}</p>
              <button onClick={() => setStep("captured")} className="ri-primary-btn">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
