"use client";
import React, { useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import "./getAppModal.css";
import { useClickTracking } from "../../hooks/useClickTracking";
import { EventCategory } from "../../utils/analytics";

/* ── Replace these placeholders with the real URLs ── */
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.smalltech.hashtaglocal";
const APP_STORE_URL = "https://testflight.apple.com/join/svHDxNt1";
const WHATSAPP_URL = "https://chat.whatsapp.com/EYaX2WwCuKZ0Q7r4Vt6Zsa";
const JOINTHEMOMENT_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdDjs6xd3nyzJKWtF3DEk1uQPnqVlpfYv8Ibnp8gZbRV5RV0Q/viewform?embedded=true";

function GooglePlayBadge() {
  return (
    <svg viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" aria-label="Get it on Google Play">
      <rect width="135" height="40" rx="5" fill="#000"/>
      <rect x=".5" y=".5" width="134" height="39" rx="4.5" fill="none" stroke="#A6A6A6"/>
      <defs>
        {/* Play icon gradients — 4 non-overlapping pieces of the play triangle */}
        <linearGradient id="gp-blue" x1="9" y1="20" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00A0FF"/>
          <stop offset="1" stopColor="#00BEFF"/>
        </linearGradient>
        <linearGradient id="gp-red" x1="9" y1="7" x2="27" y2="17.6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF3A44"/>
          <stop offset="1" stopColor="#C31162"/>
        </linearGradient>
        <linearGradient id="gp-green" x1="9" y1="33" x2="27" y2="22.4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#32A071"/>
          <stop offset="1" stopColor="#00F076"/>
        </linearGradient>
        <linearGradient id="gp-yellow" x1="20" y1="20" x2="31" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFBD00"/>
          <stop offset="1" stopColor="#FFD900"/>
        </linearGradient>
      </defs>
      {/* Play icon: triangle (9,7)→(31,20)→(9,33) split into 4 non-overlapping pieces */}
      <path d="M9 7L9 33L20 20Z" fill="url(#gp-blue)"/>
      <path d="M9 7L20 20L27 17.6Z" fill="url(#gp-red)"/>
      <path d="M9 33L27 22.4L20 20Z" fill="url(#gp-green)"/>
      <path d="M20 20L27 17.6L31 20L27 22.4Z" fill="url(#gp-yellow)"/>
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

          {/* Right column — join the moment form */}
          <div className="gam-right">
            <p className="gam-join-title">Join the moment</p>
            <iframe
              src={JOINTHEMOMENT_URL}
              title="Join the moment"
              className="gam-join-frame"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
