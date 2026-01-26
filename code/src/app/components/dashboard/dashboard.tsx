"use client";
import React, { useState, useEffect } from "react";
import "./dashboard.css";
import Map from "./map";
import { IssueType } from "../../models/issue";
import { useClickTracking } from "../../hooks/useClickTracking";
import { trackIssueFilter, trackError, EventCategory } from "../../utils/analytics";

type IssueFilter = IssueType | "ALL";

const ISSUE_FILTERS: { value: IssueFilter; label: string }[] = [
  { value: "ALL", label: "🌐 All issues" },
  { value: IssueType.POTHOLE, label: "🕳️ Potholes" },
  { value: IssueType.WASTE, label: "🗑️ Waste" },
  { value: IssueType.FOOTPATH, label: "🚶 Footpaths" },
  { value: IssueType.POLLUTION, label: "🌫️ Pollution" },
  { value: IssueType.HYGIENE, label: "🧼 Hygiene" },
  { value: IssueType.SAFETY, label: "🛡️ Safety" },
  { value: IssueType.OTHER, label: "📌 Other" },
];

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

export default function Dashboard() {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [selectedFilter, setSelectedFilter] = useState<IssueFilter>("ALL");
  const trackClick = useClickTracking();
  const normalizeType = (type?: string) => (type ? type.toUpperCase() : "OTHER");

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
            const normalized = normalizeType(issue.type);
            counts[normalized] = (counts[normalized] || 0) + 1;
          });

        setIssueCounts(counts);
      } catch (err) {
        console.error("Failed to load issues", err);
        trackError('api_load_error', String(err), 'dashboard_component');
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

  const handleFilterChange = (value: IssueFilter) => {
    trackIssueFilter('map_filter', value);
    setSelectedFilter(value);
  };

  const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  const visibleFilters = ISSUE_FILTERS.filter((filter) =>
    filter.value === "ALL" ? true : (issueCounts[filter.value] || 0) > 0
  );

  // If the currently selected filter disappears (count drops to zero), fall back to ALL
  useEffect(() => {
    if (!visibleFilters.some((filter) => filter.value === selectedFilter)) {
      setSelectedFilter("ALL");
    }
  }, [visibleFilters, selectedFilter]);

  return (
    <section className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                trackClick('City Dropdown Toggle', EventCategory.USER_INTERACTION);
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
          <div className="dashboard-filters" role="group" aria-label="Filter issues by type">
            {visibleFilters.map((filter) => (
              <button
                key={filter.value}
                className={`dashboard-filter ${selectedFilter === filter.value ? "active" : ""}`}
                onClick={() => handleFilterChange(filter.value)}
              >
                <span className="dashboard-filter-label">{filter.label}</span>
                <span className="dashboard-filter-count">
                  {filter.value === "ALL"
                    ? totalIssues
                    : issueCounts[filter.value] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-map-wrapper">
          <Map selectedType={selectedFilter} />
        </div>
      </div>
    </section>
  );
}
