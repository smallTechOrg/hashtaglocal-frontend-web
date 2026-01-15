"use client";
import React from "react";
import "./dashboard.css";
import Map from "./map";

export default function Dashboard() {
  return (
    <section className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>#Bengaluru</h2>
          <p className="mt-2 font-[200] text-walnut">
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
