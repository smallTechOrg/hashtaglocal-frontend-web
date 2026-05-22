"use client";
import React, { useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import "./getAppModal.css";
import { useClickTracking } from "../../hooks/useClickTracking";
import { EventCategory } from "../../utils/analytics";

/* ── Replace these placeholders with the real URLs ── */
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.smalltech.hashtaglocal";
const APP_STORE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdDjs6xd3nyzJKWtF3DEk1uQPnqVlpfYv8Ibnp8gZbRV5RV0Q/viewform?embedded=true";
const WHATSAPP_URL = "https://chat.whatsapp.com/EYaX2WwCuKZ0Q7r4Vt6Zsa";
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdDjs6xd3nyzJKWtF3DEk1uQPnqVlpfYv8Ibnp8gZbRV5RV0Q/viewform?embedded=true";

function GooglePlayBadge() {
  return (
    <svg viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" aria-label="Get it on Google Play">
      <rect width="135" height="40" rx="5" fill="#000"/>
      <path d="M7.2 40C6.1 40 5 39.5 4.2 38.7 3.4 37.9 3 36.9 3 35.8V4.2C3 3.1 3.4 2.1 4.2 1.3 5 .5 6.1 0 7.2 0h120.6c1.1 0 2.2.5 3 1.3.8.8 1.2 1.8 1.2 2.9v31.6c0 1.1-.4 2.1-1.2 2.9-.8.8-1.9 1.3-3 1.3H7.2z" fill="#A6A6A6"/>
      <path d="M127.8 1c.6 0 1.2.2 1.7.7.5.5.7 1 .7 1.7v31.2c0 .6-.2 1.2-.7 1.7-.5.5-1 .7-1.7.7H7.2c-.6 0-1.2-.2-1.7-.7-.5-.5-.7-1-.7-1.7V3.4c0-.6.2-1.2.7-1.7.5-.5 1-.7 1.7-.7h120.6M127.8 0H7.2C5.3 0 3.7.7 2.5 1.9 1.3 3.1.6 4.7.6 6.5v27c0 1.8.7 3.4 1.9 4.6C3.7 39.3 5.3 40 7.2 40h120.6c1.9 0 3.5-.7 4.7-1.9 1.2-1.2 1.9-2.8 1.9-4.6V6.5c0-1.8-.7-3.4-1.9-4.6C131.3.7 129.7 0 127.8 0z" fill="#000"/>
      {/* Play icon */}
      <path d="M19 20l-8-13.9v27.8L19 20z" fill="url(#gp-grad1)"/>
      <path d="M27 11.9L19 20l3.5 3.5 8.5-4.9c.9-.5.9-1.7 0-2.2L27 11.9z" fill="url(#gp-grad2)"/>
      <path d="M11 6.1L27 16.4l-8 8-8-13.9V6.1z" fill="url(#gp-grad3)"/>
      <path d="M11 33.9v-5.4L19 20l8 8-16 5.9z" fill="url(#gp-grad4)"/>
      <defs>
        <linearGradient id="gp-grad1" x1="11" y1="20" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00A0FF"/>
          <stop offset="1" stopColor="#00A1FF"/>
        </linearGradient>
        <linearGradient id="gp-grad2" x1="38" y1="20" x2="11" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD900"/>
          <stop offset="1" stopColor="#FFBD00"/>
        </linearGradient>
        <linearGradient id="gp-grad3" x1="11" y1="20" x2="27" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF3A44"/>
          <stop offset="1" stopColor="#C31162"/>
        </linearGradient>
        <linearGradient id="gp-grad4" x1="11" y1="28" x2="27" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#32A071"/>
          <stop offset="1" stopColor="#2DA771"/>
        </linearGradient>
      </defs>
      {/* Text */}
      <text x="36" y="14" fill="#fff" fontSize="7" fontFamily="sans-serif" letterSpacing="0.3">GET IT ON</text>
      <text x="36" y="26" fill="#fff" fontSize="13" fontFamily="sans-serif" fontWeight="bold" letterSpacing="-0.2">Google Play</text>
    </svg>
  );
}

function AppStoreBadge() {
  return (
    <svg viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" aria-label="Download on the App Store">
      <rect width="135" height="40" rx="5" fill="#000"/>
      {/* Apple logo */}
      <path d="M24.8 20.1c0-3.4 2.8-5 2.9-5.1-1.6-2.3-4-2.6-4.9-2.7-2.1-.2-4 1.2-5.1 1.2-1 0-2.6-1.2-4.4-1.2-2.2 0-4.3 1.3-5.4 3.3-2.3 4-.6 10 1.6 13.3 1.1 1.5 2.4 3.3 4.1 3.2 1.6-.1 2.2-1 4.2-1 2 0 2.5 1 4.3 1 1.8 0 2.9-1.6 4-3.1 1.2-1.7 1.7-3.4 1.8-3.5-.1-.1-3.1-1.2-3.1-4.4z" fill="#fff"/>
      <path d="M22.4 11.2c.9-1.1 1.5-2.6 1.3-4.2-1.3.1-2.9.9-3.8 2-.8.9-1.6 2.5-1.4 3.9 1.5.1 3-.7 3.9-1.7z" fill="#fff"/>
      {/* Text */}
      <text x="36" y="14" fill="#fff" fontSize="7" fontFamily="sans-serif" letterSpacing="0.3">Download on the</text>
      <text x="36" y="27" fill="#fff" fontSize="14" fontFamily="sans-serif" fontWeight="bold" letterSpacing="-0.3">App Store</text>
    </svg>
  );
}

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
        <button className="gam-close" onClick={onClose} aria-label="Close" type="button">
          <X size={18} />
        </button>

        <div className="gam-layout">
          {/* Left column — download links */}
          <div className="gam-left">
            <div className="gam-head">
              <p className="gam-eyebrow">Join the movement</p>
              <h2 className="gam-title">Get #local</h2>
              <p className="gam-sub">
                Report civic issues, track community events, and make your neighbourhood better.
              </p>
            </div>

            <div className="gam-badges">
              <a
                className="gam-badge-link"
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Play Store")}
              >
                <GooglePlayBadge />
              </a>
              <a
                className="gam-badge-link"
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("App Store")}
              >
                <AppStoreBadge />
              </a>
            </div>

            <a
              className="gam-whatsapp"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("WhatsApp Group")}
            >
              <span className="gam-whatsapp-icon">
                <MessageCircle size={18} />
              </span>
              <span className="gam-whatsapp-text">
                <span className="gam-whatsapp-label">Join our WhatsApp community</span>
                <span className="gam-whatsapp-meta">Chat with local changemakers</span>
              </span>
            </a>
          </div>

          {/* Right column — feedback form */}
          <div className="gam-right">
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
    </div>
  );
}
