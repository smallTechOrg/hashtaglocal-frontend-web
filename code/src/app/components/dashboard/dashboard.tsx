"use client";
import React, { useState, useEffect } from "react";
import "./dashboard.css";
import Map from "./map";
import { IssueType } from "../../models/issue";
// import { useClickTracking } from "../../hooks/useClickTracking";
import { trackIssueFilter, trackError } from "../../utils/analytics";

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


const CITY_OPTIONS = [
  { label: "#bengaluru", value: "%23bengaluru" },
  { label: "#nashik", value: "%23nashik" },
  { label: "#sikar", value: "%23sikar" },
];



export default function Dashboard() {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState(CITY_OPTIONS[0].value);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [selectedFilter, setSelectedFilter] = useState<IssueFilter>("ALL");
  // const trackClick = useClickTracking();
  const normalizeType = (type?: string) => (type ? type.toUpperCase() : "OTHER");

  useEffect(() => {
    async function loadIssues() {
      try {
        const endpoint = `https://staging.api.smalltech.in/local/api/v1/issues?locality=${selectedCity}`;
        const res = await fetch(endpoint, { cache: "no-store" });
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
  }, [selectedCity]);

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
          <select
            id="city-select"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="text-walnut font-[500] text-[18px] sm:text-[22px] md:text-[26px] lg:text-2xl mb-3 mt-1"
          >
            {CITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
          <Map selectedType={selectedFilter} selectedCity={selectedCity} />
        </div>
      </div>
    </section>
  );
}
