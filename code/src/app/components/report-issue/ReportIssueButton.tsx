"use client";

import { useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import ReportIssueModal from "./ReportIssueModal";
import IssueGuidelinesModal from "./IssueGuidelinesModal";

const GUIDELINES_KEY = "ri_guidelines_accepted";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function hasRecentlyAccepted(): boolean {
  try {
    const stored = localStorage.getItem(GUIDELINES_KEY);
    if (!stored) return false;
    const { ts } = JSON.parse(stored);
    return Date.now() - ts < ONE_MONTH_MS;
  } catch {
    return false;
  }
}

function saveAcceptance(): void {
  try {
    localStorage.setItem(GUIDELINES_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {
    // storage unavailable — proceed anyway
  }
}

type Variant = "header" | "map-bottom" | "fab";

interface ReportIssueButtonProps {
  variant?: Variant;
}

export default function ReportIssueButton({ variant = "header" }: ReportIssueButtonProps) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    function open() {
      if (hasRecentlyAccepted()) {
        setModalOpen(true);
      } else {
        setGuidelinesOpen(true);
      }
    }

    // Primary: URL param set by auth callback.
    // Using a URL param rather than sessionStorage means it works even when the
    // mobile browser runs OAuth in a separate context (Custom Tab / SafariVC) and
    // the original tab's sessionStorage is unreachable. The param also forces a
    // fresh page load so the effect always runs (no bfcache restore).
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoopen") === "report") {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("autoopen");
      window.history.replaceState({}, "", clean.toString());
      open();
    }

    // Fallback: sessionStorage flag (covers the case where returnTo already had
    // ?autoopen=report but bfcache somehow restored the page without it).
    function checkPending() {
      if (sessionStorage.getItem("report_issue_pending")) {
        sessionStorage.removeItem("report_issue_pending");
        open();
      }
    }
    checkPending();
    window.addEventListener("pageshow", checkPending);
    return () => window.removeEventListener("pageshow", checkPending);
  }, []);

  const handleOpen = () => {
    if (hasRecentlyAccepted()) {
      setModalOpen(true);
    } else {
      setGuidelinesOpen(true);
    }
  };

  const handleAgree = () => {
    saveAcceptance();
    setGuidelinesOpen(false);
    setModalOpen(true);
  };

  return (
    <>
      {/* {variant === "header" && (
        <button
          className="ri-header-btn"
          onClick={handleOpen}
          aria-label="Report a community issue"
        >
          <TriangleAlert size={13} />
          <span>Report a community Issue</span>
        </button>
      )} */}

      {variant === "map-bottom" && (
        <button
          className="ri-map-bottom-btn"
          onClick={handleOpen}
          aria-label="Report a community issue"
        >
          <TriangleAlert size={18} />
          <span className="ri-map-bottom-btn-content">
            <span className="ri-map-bottom-btn-main">Report a Community Issue</span>
            <span className="ri-map-bottom-btn-sub">Help make your neighbourhood better</span>
          </span>
        </button>
      )}

      {variant === "fab" && (
        <button
          className="ri-sticky-btn"
          onClick={handleOpen}
          aria-label="Report a community issue"
        >
          <TriangleAlert size={16} />
          <span className="ri-sticky-label">Report Issue</span>
        </button>
      )}

      {guidelinesOpen && (
        <IssueGuidelinesModal
          onAgree={handleAgree}
          onClose={() => setGuidelinesOpen(false)}
        />
      )}

      {modalOpen && (
        <ReportIssueModal onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
