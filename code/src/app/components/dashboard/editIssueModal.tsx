"use client";
import React, { useState } from "react";
import { Issue, IssueStatus, IssueType, UpdateIssueRequest } from "../../models/issue";
import { updateIssue } from "../../api/issueService";
import "./editIssueModal.css";

interface EditIssueModalProps {
  issue: Issue;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditIssueModal({ issue, onClose, onUpdate }: EditIssueModalProps) {
  const [status, setStatus] = useState<string>(issue.status || "");
  const [type, setType] = useState<string>(issue.type || "");
  const [description, setDescription] = useState<string>(issue.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updates: UpdateIssueRequest = {};
      
      // Only include fields that have changed
      if (status && status !== issue.status) {
        updates.status = status;
      }
      if (type && type !== issue.type) {
        updates.type = type;
      }
      if (description !== issue.description) {
        updates.description = description;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateIssue(issue.id, updates);
        onUpdate();
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Issue #{issue.id}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
            >
              <option value="">Select Status</option>
              {Object.values(IssueStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="form-select"
            >
              <option value="">Select Type</option>
              {Object.values(IssueType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={4}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
