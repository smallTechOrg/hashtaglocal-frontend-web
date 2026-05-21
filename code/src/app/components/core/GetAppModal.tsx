"use client";
import React, { useEffect } from "react";
import { X, Smartphone, Apple, MessageCircle } from "lucide-react";
import "./getAppModal.css";
import { useClickTracking } from "../../hooks/useClickTracking";
import { EventCategory } from "../../utils/analytics";

/* ── Replace these placeholders with the real URLs ── */
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=YOUR_APP_ID";
const APP_STORE_URL = "https://apps.apple.com/app/idYOUR_APP_ID";
const WHATSAPP_URL = "https://chat.whatsapp.com/YOUR_INVITE_CODE";
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdDjs6xd3nyzJKWtF3DEk1uQPnqVlpfYv8Ibnp8gZbRV5RV0Q/viewform?embedded=true";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GetAppModal({ open, onClose }: Props) {
  const trackClick = useClickTracking();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const track = (label: string) =>
    trackClick(label, EventCategory.ENGAGEMENT, { source: "get_app_modal" });

  return (
    <div className="gam-overlay" onClick={onClose} role="presentation">
      <div
        className="gam-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Get the #local app"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="gam-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="gam-head">
          <p className="gam-eyebrow">Join the movement</p>
          <h2 className="gam-title">Get #local</h2>
          <p className="gam-sub">
            Download the app, join the community, or send us feedback.
          </p>
        </div>

        <div className="gam-actions">
          <a
            className="gam-action"
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("Play Store")}
          >
            <span className="gam-action-icon gam-icon-android">
              <Smartphone size={20} />
            </span>
            <span className="gam-action-text">
              <span className="gam-action-label">Google Play</span>
              <span className="gam-action-meta">Android app</span>
            </span>
          </a>

          <a
            className="gam-action"
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("App Store")}
          >
            <span className="gam-action-icon gam-icon-apple">
              <Apple size={20} />
            </span>
            <span className="gam-action-text">
              <span className="gam-action-label">App Store</span>
              <span className="gam-action-meta">iOS app</span>
            </span>
          </a>

          <a
            className="gam-action"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("WhatsApp Group")}
          >
            <span className="gam-action-icon gam-icon-whatsapp">
              <MessageCircle size={20} />
            </span>
            <span className="gam-action-text">
              <span className="gam-action-label">WhatsApp group</span>
              <span className="gam-action-meta">Chat with the community</span>
            </span>
          </a>
        </div>

        <div className="gam-feedback">
          <p className="gam-feedback-title">Share your feedback</p>
          <iframe
            src={FEEDBACK_FORM_URL}
            title="Feedback form"
            className="gam-feedback-frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
