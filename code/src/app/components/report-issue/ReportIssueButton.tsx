"use client";

import { useState, useEffect } from "react";
import { Flag } from "lucide-react";
import ReportIssueModal from "./ReportIssueModal";

export default function ReportIssueButton() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Auto-open if user just returned from Google sign-in
    if (typeof window !== "undefined" && sessionStorage.getItem("report_issue_pending")) {
      sessionStorage.removeItem("report_issue_pending");
      setModalOpen(true);
    }
  }, []);

  return (
    <>
      <button
        className="ri-sticky-btn"
        onClick={() => setModalOpen(true)}
        aria-label="Report an Issue"
      >
        <Flag size={18} aria-hidden="true" />
        <span className="ri-sticky-label">Report an Issue</span>
      </button>

      {modalOpen && <ReportIssueModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
