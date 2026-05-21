"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import "./dashboard.css";
import Map from "./map";
import { IssueType } from "../../models/issue";
import { API_PATHS } from "../../constants/api";
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

interface CityOptionsResponse {
  data?: {
    issues?: Array<{
      location?: {
        locality?: {
          hashtags?: string[];
        };
      };
    }>;
  };
}


interface DashboardProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
}

export default function Dashboard({ selectedCity, onCityChange }: DashboardProps) {
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [selectedFilter, setSelectedFilter] = useState<IssueFilter>("ALL");
  const [cityOptions, setCityOptions] = useState<{ label: string; value: string }[]>([]);
  const [cityOptionsLoading, setCityOptionsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // const trackClick = useClickTracking();
  const normalizeType = (type?: string) => (type ? type.toUpperCase() : "OTHER");

  useEffect(() => {
    async function loadCityOptions() {
      try {
        const res = await fetch(API_PATHS.issues, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload: CityOptionsResponse = await res.json();
        const issues = payload.data?.issues || [];

        const hashtagSet = new Set<string>();
        issues.forEach(issue => {
          issue.location?.locality?.hashtags?.forEach(tag => {
            hashtagSet.add(tag.toLowerCase());
          });
        });

        const options = [
          { label: "#india", value: "%23india" },
          ...Array.from(hashtagSet).sort().map(tag => ({
            label: tag.startsWith('#') ? tag : '#' + tag,
            value: encodeURIComponent(tag),
          })),
        ];
        setCityOptions(options);
      } catch (err) {
        console.error("Failed to load city options", err);
        setCityOptions([{ label: "#india", value: "%23india" }]);
      } finally {
        setCityOptionsLoading(false);
      }
    }
    loadCityOptions();
  }, []);

  useEffect(() => {
    async function loadIssues() {
      try {
        const endpoint = selectedCity === "%23india"
          ? API_PATHS.issues
          : `${API_PATHS.issues}?locality=${selectedCity}`;
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
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              onClick={() => { setIsOpen(o => !o); setSearchQuery(""); }}
              disabled={cityOptionsLoading}
              className="text-walnut font-[500] text-[18px] sm:text-[22px] md:text-[26px] lg:text-2xl mb-3 mt-1 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {cityOptionsLoading
                ? "Loading…"
                : (cityOptions.find(o => o.value === selectedCity)?.label ?? decodeURIComponent(selectedCity))}
              <ChevronDown className={`w-5 h-5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search city…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto py-1">
                  {cityOptions
                    .filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(opt => (
                      <li key={opt.value}>
                        <button
                          className={`w-full text-center px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                            opt.value === selectedCity
                              ? "font-semibold text-blue-600 bg-blue-50"
                              : "text-gray-700"
                          }`}
                          onClick={() => { onCityChange(opt.value); setIsOpen(false); setSearchQuery(""); }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  {cityOptions.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-400 text-center">No city found</li>
                  )}
                </ul>
                <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400 text-center">
                  Can&apos;t find your city? Report an issue so it appears here!
                </div>
              </div>
            )}
          </div>
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
        <div className="dashboard-map-wrapper">
          <Map selectedType={selectedFilter} selectedCity={selectedCity} />
        </div>
      </div>
    </section>
  );
}
