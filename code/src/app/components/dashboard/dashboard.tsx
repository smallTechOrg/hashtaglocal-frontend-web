"use client";
import React, { useState, useEffect } from "react";
import "./dashboard.css";
import Map from "./map";

interface IssuesResponse {
  data?: {
    issues?: Array<{
      id: number;
      type?: string;
      status?: string;
    }>;
  };
}

const ENDPOINT = process.env.NODE_ENV === "production"
  ? "https://staging.api.smalltech.in/local/api/v1/issues"
  : "/api/issues";

const issueTypeEmojis: Record<string, string> = {
  POTHOLE: "🕳️",
  WASTE: "🗑️",
  FOOTPATH: "🚶",
  POLLUTION: "🏭",
  HYGIENE: "🧼",
  SAFETY: "⚠️",
  OTHER: "📋",
};

export default function Dashboard() {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadIssues() {
      try {
        const res = await fetch(ENDPOINT, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload: IssuesResponse = await res.json();
        const issues = payload.data?.issues || [];

        const counts: Record<string, number> = {};
        issues
          .filter((issue) => issue.status === "OPEN")
          .forEach((issue) => {
            const type = issue.type || "OTHER";
            counts[type] = (counts[type] || 0) + 1;
          });

        setIssueCounts(counts);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load issues", err);
        setIsLoading(false);
      }
    }

    loadIssues();
  }, []);

  useEffect(() => {
    if (!showCityDropdown) return;

    const handleClickOutside = () => {
      setShowCityDropdown(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showCityDropdown]);

  const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);

  return (
    <section className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCityDropdown(!showCityDropdown);
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: "inherit",
                fontWeight: "inherit",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0 }}>#bengaluru</h2>
              <span style={{ fontSize: "0.8em" }}>▼</span>
            </button>
            {showCityDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "0.5rem",
                  padding: "0.375rem 0.625rem",
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "0.25rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  fontSize: "0.8125rem",
                }}
              >
                <p style={{ margin: 0, color: "#666" }}>
                  🚀 Other cities coming soon
                </p>
              </div>
            )}
          </div>
          {isLoading ? (
            <p className="mt-2 font-[200] text-walnut" style={{ textAlign: "center", marginTop: "1rem", marginBottom: "0.5rem" }}>Loading issue summary...</p>
          ) : (
            <p className="mt-2 font-[200] text-walnut" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "center", marginTop: "1rem", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: "500" }}>{totalIssues} open issues</span>
              <span style={{ color: "#ccc" }}>•</span>
              {Object.entries(issueCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count], index, arr) => {
                  const emoji = issueTypeEmojis[type.toUpperCase()];
                  const displayName = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                  return (
                    <React.Fragment key={type}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        {emoji || "📋"} {displayName}: {count}
                      </span>
                      {index < arr.length - 1 && <span style={{ color: "#ccc" }}>•</span>}
                    </React.Fragment>
                  );
                })}
            </p>
          )}
        </div>
        <div className="dashboard-map-wrapper">
          <Map />
        </div>
      </div>
    </section>
  );
}
