"use client";
import React from "react";
import "./dashboard.css";
import Map from "./map";

export default function Dashboard() {
  return (
    <section className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">#Bangalore</h1>
          <p className="dashboard-subtitle">
            A city wide dashboard to view all the reported issues.
          </p>
        </div>
        <div className="dashboard-map-wrapper">
          <Map />
        </div>
      </div>
    </section>
  );
}
