"use client";
import React, { useEffect, useState } from "react";

interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
}

// Sample locations in Bangalore
const sampleLocations: LocationPin[] = [
  { id: "1", lat: 12.9716, lng: 77.5946, title: "Downtown Bangalore" },
  { id: "2", lat: 12.935, lng: 77.6245, title: "Whitefield" },
  { id: "3", lat: 12.9352, lng: 77.624, title: "Koramangala" },
  { id: "4", lat: 13.0361, lng: 77.5959, title: "Indiranagar" },
  { id: "5", lat: 12.9698, lng: 77.7499, title: "Marathahalli" },
];

export default function Map() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="map-container">
      {!isMapLoaded && (
        <div className="map-loading">
          <p>Loading map...</p>
        </div>
      )}
      <svg
        viewBox="0 0 400 500"
        className={`map-svg ${isMapLoaded ? "map-loaded" : ""}`}
      >
        {/* Bangalore city boundary approximation */}
        <defs>
          <pattern
            id="city-pattern"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <circle cx="2" cy="2" r="0.5" fill="#e0e7ff" />
          </pattern>
        </defs>

        {/* City background */}
        <rect width="400" height="500" fill="#f3f4f6" />
        <rect
          x="50"
          y="50"
          width="300"
          height="400"
          fill="url(#city-pattern)"
          stroke="#9ca3af"
          strokeWidth="2"
        />

        {/* City label */}
        <text x="200" y="30" textAnchor="middle" fontSize="16" fill="#4b5563">
          Bangalore Metropolitan Area
        </text>

        {/* Location pins */}
        {sampleLocations.map((location) => {
          // Map lat/lng to SVG coordinates
          const svgX = 50 + ((location.lng - 77.4) / 0.5) * 300;
          const svgY = 50 + ((13.1 - location.lat) / 0.5) * 400;

          return (
            <g key={location.id}>
              {/* Pin circle */}
              <circle
                cx={svgX}
                cy={svgY}
                r="8"
                fill="#10b981"
                opacity="0.8"
              />
              {/* Pin border */}
              <circle
                cx={svgX}
                cy={svgY}
                r="8"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
              />
              {/* Pin indicator */}
              <circle cx={svgX} cy={svgY} r="3" fill="white" />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot"></span>
          <span className="legend-text">Reported Issues</span>
        </div>
      </div>
    </div>
  );
}
