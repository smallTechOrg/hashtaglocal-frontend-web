"use client";

import Link from "next/link";
import { Camera, CheckCircle2, Info, XCircle, Wrench, Trash2, PersonStanding, Wind, Brush, Lightbulb, HelpCircle } from "lucide-react";
import "../components/report-issue/reportIssue.css";

export default function ReportGuidelinesPage() {
  return (
    <div className="rg-page">
      <div className="rg-content">
        <h1 className="rg-heading">Guidelines for Reporting Issues</h1>

        {/* What is an issue */}
        <div className="rg-item rg-item--green">
          <CheckCircle2 size={20} className="rg-item-icon rg-item-icon--green" />
          <p className="rg-item-text">
            <strong>What is an Issue?</strong> Anything that negatively impacts the
            community&apos;s well-being, safety, or environment.
          </p>
        </div>

        {/* Types of issues */}
        <div className="rg-item rg-item--blue">
          <Info size={20} className="rg-item-icon rg-item-icon--blue" />
          <div className="rg-item-text">
            <strong>Types of Issues You Can Report:</strong>
            <ul className="rg-type-list">
              <li><Wrench size={14} /> Potholes &amp; Road Damages</li>
              <li><Trash2 size={14} /> Waste &amp; Garbage Disposal</li>
              <li><PersonStanding size={14} /> Footpath &amp; Walkability Issues</li>
              <li><Wind size={14} /> Air, Water or Noise Pollution</li>
              <li><Brush size={14} /> Hygiene &amp; Sanitation</li>
              <li><Lightbulb size={14} /> Safety &amp; Street Lighting</li>
              <li><HelpCircle size={14} /> Other Community Issues</li>
            </ul>
          </div>
        </div>

        {/* What not to do */}
        <div className="rg-item rg-item--red">
          <XCircle size={20} className="rg-item-icon rg-item-icon--red" />
          <p className="rg-item-text">
            Any inappropriate content or misuse of the app will lead to a permanent ban.
          </p>
        </div>
      </div>

      {/* Report Issue CTA */}
      <div className="rg-footer">
        <Link href="/report/camera" className="rg-report-btn">
          <Camera size={20} />
          Report Issue
        </Link>
      </div>
    </div>
  );
}
