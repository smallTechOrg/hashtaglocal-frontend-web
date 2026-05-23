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
    // Auto-open if user just returned from Google sign-in
    if (typeof window !== "undefined" && sessionStorage.getItem("report_issue_pending")) {
      sessionStorage.removeItem("report_issue_pending");
      // If already accepted guidelines, skip straight to the form
      if (hasRecentlyAccepted()) {
        setModalOpen(true);
      } else {
        setGuidelinesOpen(true);
      }
    }
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
