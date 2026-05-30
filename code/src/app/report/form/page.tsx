"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TriangleAlert,
  MapPin,
  Loader2,
  CheckCircle2,
  ChevronDown,
  X,
  Check,
  CheckCircle,
} from "lucide-react";
import { getAccessToken } from "../../ops/lib/auth";
import { API_PATHS } from "../../constants/api";
import { reverseGeocode } from "../../utils/geocoding";
import { getReportData, clearReportData, setReportLocation } from "../../components/report-issue/reportStore";
import "../../components/report-issue/reportIssue.css";

type IssueType = "POTHOLE" | "WASTE" | "FOOTPATH" | "POLLUTION" | "HYGIENE" | "SAFETY" | "OTHER";

const ISSUE_TYPES: { value: IssueType; label: string; icon: string }[] = [
  { value: "POTHOLE", label: "Potholes & Road Damages", icon: "🔧" },
  { value: "WASTE", label: "Waste & Garbage Disposal", icon: "🗑️" },
  { value: "FOOTPATH", label: "Footpath & Walkability Issues", icon: "🚶" },
  { value: "POLLUTION", label: "Pollution (Air, Noise & Water)", icon: "💨" },
  { value: "HYGIENE", label: "Hygiene & Sanitation", icon: "🧹" },
  { value: "SAFETY", label: "Safety & Street Lighting", icon: "💡" },
  { value: "OTHER", label: "Other Community Issues", icon: "❓" },
];

type UploadStatus = "uploading" | "done" | "error";

export default function ReportFormPage() {
  const router = useRouter();
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState("");
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("uploading");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const uploadedPathRef = useRef<string | null>(null);
  const uploadStatusRef = useRef<UploadStatus>("uploading");
  const [submitting, setSubmitting] = useState(false);
  const [successIssueId, setSuccessIssueId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const reportData = useRef(getReportData());

  // Redirect if no photo was captured
  useEffect(() => {
    if (!reportData.current.blob) {
      router.replace("/report/camera");
    }
  }, [router]);

  // Start image upload immediately on mount
  useEffect(() => {
    const blob = reportData.current.blob;
    if (!blob) return;

    async function uploadImage() {
      const token = getAccessToken();
      if (!token) { setUploadStatus("error"); return; }
      try {
        const urlRes = await fetch(API_PATHS.mediaUploadUrl("image/jpeg"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!urlRes.ok) throw new Error("upload-url");
        const { data } = await urlRes.json();
        const { signed_url, path } = data.media_url as { signed_url: string; path: string };

        const putRes = await fetch(signed_url, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!putRes.ok) throw new Error("upload");

        uploadedPathRef.current = path;
        uploadStatusRef.current = "done";
        setUploadedPath(path);
        setUploadStatus("done");
      } catch {
        uploadStatusRef.current = "error";
        setUploadStatus("error");
      }
    }

    uploadImage();
   
  }, []);

  // Fetch / confirm location on mount
  useEffect(() => {
    const existing = reportData.current.position;
    if (existing) {
      setLocationReady(true);
      buildLocationLabel(existing.coords.latitude, existing.coords.longitude);
      if (!reportData.current.locationMeta) {
        reverseGeocode(existing.coords.latitude, existing.coords.longitude).then((meta) => {
          if (meta) setReportLocation(existing, meta);
        });
      }
      return;
    }

    // Fallback: get location now (permission already granted from button check)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportLocation(pos, null);
        setLocationReady(true);
        buildLocationLabel(pos.coords.latitude, pos.coords.longitude);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((meta) => {
          if (meta) setReportLocation(pos, meta);
        });
      },
      () => {
        // Location unavailable — allow submit without it
        setLocationReady(true);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
   
  }, []);

  function buildLocationLabel(lat: number, lng: number) {
    const latStr = `${Math.abs(lat).toFixed(7)}°${lat >= 0 ? "N" : "S"}`;
    const lngStr = `${Math.abs(lng).toFixed(7)}°${lng >= 0 ? "E" : "W"}`;
    const now = new Date().toLocaleString("en-IN", { timeZoneName: "short" });
    setLocationLabel(`Lat: ${latStr} Long: ${lngStr}\n${now}`);
  }

  async function handleSubmit() {
    if (!issueType) return;

    const token = getAccessToken();
    if (!token) { router.replace("/?autoopen=report"); return; }

    const { position, locationMeta, blob } = reportData.current;
    if (!blob) { router.replace("/report/camera"); return; }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let path = uploadedPath;

      // If upload is still in progress, wait up to 30 s
      if (!path) {
        path = await waitForUpload(30000);
      }
      if (!path) throw new Error("Image upload failed. Please try again.");

      const locationPayload = position
        ? {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            meta_data: locationMeta ?? { accuracy: position.coords.accuracy, timestamp: position.timestamp },
          }
        : null;

      const issueRes = await fetch(API_PATHS.reportIssue, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          issue: {
            type: issueType,
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(locationPayload ? { location: locationPayload } : {}),
            media_urls: [{ type: "PHOTO", url: path, ...(locationPayload ? { location: locationPayload } : {}) }],
          },
        }),
      });

      if (!issueRes.ok) throw new Error("Failed to submit. Please try again.");
      const issueData = await issueRes.json();
      const newId: number | undefined = issueData?.data?.issue_id;
      clearReportData();
      setSuccessIssueId(newId ?? 0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function waitForUpload(ms: number): Promise<string | null> {
    return new Promise((resolve) => {
      const deadline = Date.now() + ms;
      const interval = setInterval(() => {
        if (uploadedPathRef.current) { clearInterval(interval); resolve(uploadedPathRef.current); return; }
        if (uploadStatusRef.current === "error" || Date.now() > deadline) { clearInterval(interval); resolve(null); }
      }, 200);
    });
  }

  const selectedType = ISSUE_TYPES.find((t) => t.value === issueType);
  const previewUrl = reportData.current.previewUrl;

  return (
    <div className="rf-page">
      {/* Custom header */}
      <div className="rf-header">
        <button className="rf-back-btn" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="rf-title">Report Issue</h1>
      </div>

      {/* Location info bar */}
      {locationLabel && (
        <div className="rf-location-bar">
          <MapPin size={13} className="rf-location-bar-icon" />
          <span className="rf-location-bar-text">{locationLabel}</span>
        </div>
      )}

      {/* Scrollable body */}
      <div className="rf-body">
        {/* Captured photo */}
        {previewUrl && (
          <div className="rf-photo-container">
            <img src={previewUrl} alt="Captured issue photo" className="rf-photo" />
          </div>
        )}

        {/* Status badges */}
        <div className="rf-badges">
          {locationReady && (
            <div className="rf-badge rf-badge--location">
              <MapPin size={13} />
              Location captured
            </div>
          )}
          {uploadStatus === "uploading" && (
            <div className="rf-badge rf-badge--uploading">
              <Loader2 size={13} className="ri-icon-spin" />
              Uploading image...
            </div>
          )}
          {uploadStatus === "done" && (
            <div className="rf-badge rf-badge--uploaded">
              <CheckCircle2 size={13} />
              Image uploaded successfully!
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="rf-badge rf-badge--error">
              Upload failed — you can still submit
            </div>
          )}
        </div>

        {/* Form section */}
        <div className="rf-form-section">
          <div className="rf-form-heading">
            <TriangleAlert size={18} className="rf-form-heading-icon" />
            <span>Report Issue</span>
          </div>

          {/* Issue type */}
          <div className="rf-field">
            <div className="rf-field-label-row">
              <label className="rf-label">Issue Type <span className="rf-required">*</span></label>
              <span className="rf-required-text">Required</span>
            </div>
            <button
              className={`rf-type-selector${issueType ? " rf-type-selector--selected" : ""}`}
              onClick={() => setTypeSheetOpen(true)}
              type="button"
            >
              {selectedType ? (
                <span className="rf-type-selector-value">
                  <span>{selectedType.icon}</span>
                  <span>{selectedType.label}</span>
                </span>
              ) : (
                <span className="rf-type-selector-placeholder">Select issue type</span>
              )}
              <ChevronDown size={16} className="rf-type-selector-chevron" />
            </button>
          </div>

          {/* Description */}
          <div className="rf-field">
            <label className="rf-label">Description <span className="rf-optional-text">(Optional)</span></label>
            <textarea
              className="rf-textarea"
              placeholder="Add details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
            />
            {description.length > 0 && (
              <span className="rf-char-count">{description.length}/500</span>
            )}
          </div>

          {/* Error message */}
          {errorMsg && <p className="rf-error-text">{errorMsg}</p>}

          {/* Submit */}
          <button
            className="rf-submit-btn"
            onClick={handleSubmit}
            disabled={!issueType || submitting}
            type="button"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="ri-icon-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check size={16} />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Issue type bottom sheet */}
      {typeSheetOpen && (
        <div className="rbs-overlay" onClick={() => setTypeSheetOpen(false)}>
          <div className="rbs-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rbs-header">
              <TriangleAlert size={16} className="rbs-header-icon" />
              <span className="rbs-header-title">Select Issue Type</span>
              <button className="rbs-close" onClick={() => setTypeSheetOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="rbs-list">
              {ISSUE_TYPES.map((t) => {
                const selected = issueType === t.value;
                return (
                  <button
                    key={t.value}
                    className={`rbs-item${selected ? " rbs-item--selected" : ""}`}
                    onClick={() => { setIssueType(t.value); setTypeSheetOpen(false); }}
                    type="button"
                  >
                    <span className="rbs-item-icon">{t.icon}</span>
                    <span className="rbs-item-label">{t.label}</span>
                    {selected && <CheckCircle size={18} className="rbs-item-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {successIssueId !== null && (
        <div className="rs-overlay">
          <div className="rs-card">
            <h2 className="rs-title">Success</h2>
            <p className="rs-note">Issue reported successfully!</p>
            <p className="rs-note">
              The issue is currently on hold and will be reviewed by our admin before it is made public.
            </p>
            <p className="rs-note">⭐ +5 Karma Points!</p>
            <div className="rs-actions">
              {successIssueId > 0 && (
                <button
                  className="rs-action-btn"
                  onClick={() => router.push(`/issue/${successIssueId}?new=1`)}
                >
                  VIEW ISSUE
                </button>
              )}
              <button
                className="rs-action-btn"
                onClick={() => router.push("/")}
              >
                GO HOME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
