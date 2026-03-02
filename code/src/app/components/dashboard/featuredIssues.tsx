import React from "react";
import "./map.css";
import { LocationPin } from "./mapTypes";
import ImageSlideshow from "../ImageSlideshow";

type Props = {
  latestIssues: LocationPin[];
  onSelectIssue: (issue: LocationPin) => void;
  formatTimeAgo: (date?: string) => string;
  getLocationLabel: (pin: LocationPin) => string;
};

export default function FeaturedIssues({
  latestIssues,
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
      </div>

      {latestIssues.length === 0 ? (
        <p className="empty-state">No issues found yet.</p>
      ) : (
        <div className="issue-home-list">
          {latestIssues.map((issue) => (
            <div
              className="issue-home-card"
              key={issue.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectIssue(issue)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectIssue(issue);
              }}
            >
              <div className="issue-home-hero">
                <ImageSlideshow
                  images={
                    issue.images && issue.images.length > 0
                      ? issue.images
                      : [{ url: issue.image, thumbnail: issue.imageThumbnail }]
                  }
                  alt={issue.title}
                  imageClassName="issue-home-image"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
