"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  CheckCircle2,
  Lock,
  Check,
  BadgeCheck,
} from "lucide-react";
import { getAccessToken } from "../../../ops/lib/auth";
import { API_PATHS } from "../../../constants/api";
import { reverseGeocode } from "../../../utils/geocoding";
import { getReportData, clearReportData, setReportLocation } from "../../../components/report-issue/reportStore";
import "../../../components/report-issue/reportIssue.css";

type Action = "VERIFY" | "RESOLVE";
type UploadStatus = "uploading" | "done" | "error";

const TYPE_LABELS: Record<string, string> = {
  POTHOLE: "Potholes & Road Damages",
  WASTE: "Waste & Garbage Disposal",
  FOOTPATH: "Footpath & Walkability Issues",
  POLLUTION: "Pollution (Air, Noise & Water)",
  HYGIENE: "Hygiene & Sanitation",
  SAFETY: "Safety & Street Lighting",
  OTHER: "Other Community Issues",
};

const TYPE_ICONS: Record<string, string> = {
  POTHOLE: "🔧", WASTE: "🗑️", FOOTPATH: "🚶", POLLUTION: "💨",
  HYGIENE: "🧹", SAFETY: "💡", OTHER: "❓",
};

export default function UpdateFormClient() {
  const router = useRouter();

  // Read id and type from URL at runtime
  const [id, setId] = useState("");
  const [issueType, setIssueType] = useState("");

  useEffect(() => {
    const match = window.location.pathname.match(/\/update\/([^/]+)\/form/);
    const params = new URLSearchParams(window.location.search);
    const pathId = match?.[1];
    const id = (pathId && pathId !== "index") ? pathId : (params.get("id") ?? "");
    if (id) setId(id);
    setIssueType(params.get("type") ?? "");
  }, []);

  const [description, setDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("uploading");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const uploadedPathRef = useRef<string | null>(null);
  const uploadStatusRef = useRef<UploadStatus>("uploading");
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [successAction, setSuccessAction] = useState<Action | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  const reportData = useRef(getReportData());

  // Redirect if no photo (once id is resolved)
  useEffect(() => {
    if (!id) return;
    if (!reportData.current.blob) {
      router.replace(`/update/${id}/camera?type=${encodeURIComponent(issueType)}`);
    }
  }, [router, id, issueType]);

  // Start upload immediately
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
        if (!urlRes.ok) throw new Error();
        const { data } = await urlRes.json();
        const { signed_url, path } = data.media_url as { signed_url: string; path: string };

        const putRes = await fetch(signed_url, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!putRes.ok) throw new Error();

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

  // Confirm / fetch location
  useEffect(() => {
    const existing = reportData.current.position;
    if (existing) {
      setLocationReady(true);
      if (!reportData.current.locationMeta) {
        reverseGeocode(existing.coords.latitude, existing.coords.longitude).then((meta) => {
          if (meta) setReportLocation(existing, meta);
        });
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportLocation(pos, null);
        setLocationReady(true);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((meta) => {
          if (meta) setReportLocation(pos, meta);
        });
      },
      () => setLocationReady(true),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);  

  function waitForUpload(ms: number): Promise<string | null> {
    return new Promise((resolve) => {
      const deadline = Date.now() + ms;
      const interval = setInterval(() => {
        if (uploadedPathRef.current) { clearInterval(interval); resolve(uploadedPathRef.current); return; }
        if (uploadStatusRef.current === "error" || Date.now() > deadline) { clearInterval(interval); resolve(null); }
      }, 200);
    });
  }

  async function handleAction(action: Action) {
    if (!id) return;
    const token = getAccessToken();
    if (!token) { router.replace(`/issue/${id}?update=1`); return; }
    const { position, locationMeta } = reportData.current;

    setSubmitting(action);
    setErrorMsg(null);

    try {
      let path = uploadedPath;
      if (!path) path = await waitForUpload(30000);
      if (!path) throw new Error("Image upload failed. Please try again.");

      const mediaEntry: Record<string, unknown> = { type: "PHOTO", url: path };
      if (position) {
        mediaEntry.location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          meta_data: locationMeta ?? { accuracy: position.coords.accuracy },
        };
      }
      if (description.trim()) mediaEntry.description = description.trim();

      const updateRes = await fetch(API_PATHS.issue(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ issue_action: { action, media_urls: [mediaEntry] } }),
      });
      if (!updateRes.ok) throw new Error("Failed to submit. Please try again.");

      clearReportData();
      setSuccessAction(action);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(null);
    }
  }

  const previewUrl = reportData.current.previewUrl;
  const typeLabel = TYPE_LABELS[issueType] ?? issueType;
  const typeIcon = TYPE_ICONS[issueType] ?? "📌";

  return (
    <div className="rf-page">
      <div className="rf-header">
        <button className="rf-back-btn" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="rf-title">Report Issue</h1>
      </div>

      <div className="rf-body">
        {previewUrl && (
          <div className="rf-photo-container">
            <img src={previewUrl} alt="Captured issue photo" className="rf-photo" />
          </div>
        )}

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

        <div className="rf-form-section">
          <div className="rf-form-heading">
            <BadgeCheck size={18} className="rf-form-heading-icon" />
            <span>Verify Issue</span>
          </div>

          <div className="rf-field">
            <label className="rf-label">Issue Type</label>
            <div className="uf-type-readonly">
              <span className="uf-type-readonly-icon">{typeIcon}</span>
              <span className="uf-type-readonly-label">{typeLabel}</span>
              <Lock size={14} className="uf-type-readonly-lock" />
            </div>
          </div>

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

          {errorMsg && <p className="rf-error-text">{errorMsg}</p>}

          <div className="uf-action-buttons">
            <button
              className="uf-resolve-btn"
              onClick={() => handleAction("RESOLVE")}
              disabled={!!submitting}
              type="button"
            >
              {submitting === "RESOLVE" ? <Loader2 size={16} className="ri-icon-spin" /> : <Check size={16} />}
              Resolve Issue
            </button>
            <button
              className="uf-verify-btn"
              onClick={() => handleAction("VERIFY")}
              disabled={!!submitting}
              type="button"
            >
              {submitting === "VERIFY" ? <Loader2 size={16} className="ri-icon-spin" /> : <Check size={16} />}
              Verify Issue
            </button>
          </div>
        </div>
      </div>

      {successAction && (
        <div className="rs-overlay">
          <div className="rs-card">
            <h2 className="rs-title">Success</h2>
            {successAction === "VERIFY" ? (
              <p className="rs-note">Issue verified successfully!</p>
            ) : (
              <>
                <p className="rs-note">Thank you for resolving this issue!</p>
                <p className="rs-note">
                  Once our community reviews the status will be updated. Till then, the status will show as Pending and will be visible to others.
                </p>
              </>
            )}
            <div className="rs-actions">
              <button className="rs-action-btn" onClick={() => router.push(`/issue/${id}`)}>VIEW ISSUE</button>
              <button className="rs-action-btn" onClick={() => router.push("/")}>GO HOME</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
