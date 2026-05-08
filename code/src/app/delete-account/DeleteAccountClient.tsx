"use client";

import { useState } from "react";

const EMAIL = "contact@smalltech.in";
const SUBJECT = "Deletion of the account";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.3rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: "#f3f4f6",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "0.6rem 0.9rem",
        }}
      >
        <span style={{ flex: 1, fontFamily: "monospace", fontSize: "0.95rem", wordBreak: "break-all" }}>
          {value}
        </span>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            backgroundColor: copied ? "#16a34a" : "#fff",
            color: copied ? "#fff" : "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0.3rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background-color 0.15s, color 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function DeleteAccountClient() {
  return (
    <>
      {/* Copy-able email details */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          marginBottom: "2rem",
        }}
      >
        <p style={{ fontWeight: "700", marginBottom: "1rem", color: "#15803d" }}>
          Email details — copy and paste into any email app
        </p>
        <CopyField label="To" value={EMAIL} />
        <CopyField label="Subject" value={SUBJECT} />
        <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.75rem" }}>
          Remember to include your <strong>Gmail address</strong> (the one you used to sign in to #local) in
          the body of the email.
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "2.5rem" }}>
        {/* Opens Gmail web — works even without a configured email app */}
        <a
          href={`https://mail.google.com/mail/?view=cm&to=${EMAIL}&su=${encodeURIComponent(SUBJECT)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            backgroundColor: "#16a34a",
            color: "#fff",
            fontWeight: "700",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "1rem",
          }}
        >
          Open in Gmail (web)
        </a>

        {/* mailto fallback for users who do have a configured email client */}
        <a
          href={`mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}`}
          style={{
            display: "inline-block",
            backgroundColor: "#fff",
            color: "#16a34a",
            fontWeight: "700",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "1rem",
            border: "2px solid #16a34a",
          }}
        >
          Open in email app
        </a>
      </div>
    </>
  );
}
