"use client";

import { useState, useEffect } from "react";
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

      {modalOpen && <ReportIssueModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
