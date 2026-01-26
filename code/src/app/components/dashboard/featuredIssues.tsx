import React from "react";
import "./map.css";
import { LocationPin } from "./mapTypes";

type Props = {
  latestIssues: LocationPin[];
  selectedType: string;
  typeOptions: string[];
  onTypeChange: (value: string) => void;
  onSelectIssue: (issue: LocationPin) => void;
  formatTimeAgo: (date?: string) => string;
  getLocationLabel: (pin: LocationPin) => string;
};

export default function FeaturedIssues({
  latestIssues,
  selectedType,
  typeOptions,
  onTypeChange,
  onSelectIssue,
  formatTimeAgo,
  getLocationLabel,
}: Props) {
  return (
    <div className="issue-home">
      <div className="issue-home-header">
        <div>
          <h3 className="panel-title">Featured Issues</h3>
          <p className="panel-subtitle">Showing the latest issues</p>
        </div>
        <div className="map-filter">
          <select
            id="type-filter"
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All types" : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {latestIssues.length === 0 ? (
        <p className="empty-state">No issues found yet.</p>
      ) : (
        <div className="issue-home-list">
          {latestIssues.map((issue) => (
            <button
              className="issue-home-card"
              key={issue.id}
              onClick={() => onSelectIssue(issue)}
            >
              <div className="issue-home-hero">
                <img
                  src={issue.image}
                  alt={issue.title}
                  className="issue-home-image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="issue-home-overlay">
                  <div className="issue-home-top">
                    <span />
                    <span className="issue-home-meta">{formatTimeAgo(issue.createdAt)}</span>
                  </div>

                  <div className="issue-home-bottom">
                    <p className="issue-home-title">{issue.title}</p>
                    <p className="issue-home-location">{getLocationLabel(issue)}</p>
                  </div>
                </div>
              </div>
              <p className="issue-home-description">{issue.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
