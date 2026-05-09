"use client";

import { useState, useEffect } from "react";
import { Flag } from "lucide-react";
import ReportIssueModal from "./ReportIssueModal";

export default function ReportIssueButton() {
  const [compact, setCompact] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Auto-open if user just returned from Google sign-in
    if (typeof window !== "undefined" && sessionStorage.getItem("report_issue_pending")) {
      sessionStorage.removeItem("report_issue_pending");
      setModalOpen(true);
      setCompact(true); // skip the big-button phase on return
      return;
    }
    const timer = setTimeout(() => setCompact(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <button
        className={`ri-sticky-btn${compact ? " compact" : ""}`}
        onClick={() => setModalOpen(true)}
        aria-label="Report an Issue"
        title={compact ? "Report an Issue" : undefined}
      >
        <Flag size={18} aria-hidden="true" />
        <span className="ri-sticky-label">Report an Issue</span>
      </button>

      {modalOpen && <ReportIssueModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
