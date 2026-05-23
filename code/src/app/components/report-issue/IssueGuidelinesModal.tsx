"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import "./reportIssue.css";

interface IssueGuidelinesModalProps {
  onAgree: () => void;
  onClose: () => void;
}

export default function IssueGuidelinesModal({
  onAgree,
  onClose,
}: IssueGuidelinesModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const modal = (
    <div className="ri-overlay ri-overlay--centered" onClick={onClose}>
      <div
        className="ri-modal ri-guidelines-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ri-guidelines-header">
          <div className="ri-guidelines-title-row">
            <span className="ri-guidelines-title-icon">📋</span>
            <div>
              <h2 className="ri-guidelines-title">Issue Report Guidelines</h2>
              <p className="ri-guidelines-subtitle">
                Read before reporting a community issue
              </p>
            </div>
          </div>
          <button className="ri-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="ri-guidelines-body">

          {/* What is an issue */}
          <div className="ri-guideline-card ri-guideline-card--shield">
            <div className="ri-guideline-card-heading">
              <ShieldCheck size={16} />
              <span>What is an issue?</span>
            </div>
            <ul className="ri-guideline-card-list">
              <li>Anything that negatively impacts the community&#39;s well being, safety, or environment.</li>
            </ul>
          </div>

          {/* What to upload */}
          <div className="ri-guideline-card ri-guideline-card--ok">
            <div className="ri-guideline-card-heading">
              <CheckCircle2 size={16} />
              <span>Types of the issue you can report</span>
            </div>
            <ul className="ri-guideline-card-list">
              <li>Potholes and Road damages</li>
              <li>Waste and garbage disposal</li>
              <li>Footpath and walkability issues</li>
              <li>Air, water, or noise pollution</li>
              <li>Hygeine and Sanitation</li>
              <li>Safety and street lighting</li>
              <li>Other community issues</li>
            </ul>
          </div>

          {/* What not to upload */}
          <div className="ri-guideline-card ri-guideline-card--no">
            <div className="ri-guideline-card-heading">
              <XCircle size={16} />
              <span>What not to upload</span>
            </div>
            <ul className="ri-guideline-card-list">
              <li>Any inappropriate content or misuse of the app will lead to a permanent ban</li>
            </ul>
          </div>          

          <p className="ri-guidelines-community-note">
            By reporting, you help improve your community for everyone around you.
          </p>
        </div>

        {/* Actions */}
        <div className="ri-guidelines-actions">
          <button className="ri-guidelines-back-btn" onClick={onClose}>
            Go back
          </button>
          <button className="ri-guidelines-agree-btn" onClick={onAgree}>
            Report Issue Now
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
