"use client";
import React, { useEffect, useRef, useState } from "react";
import "./map.css";
import { Issue } from "../../models/issue";

interface IssuesResponse {
  data?: {
    issues?: Issue[];
  };
}

const ENDPOINT = process.env.NODE_ENV === "production"
  ? "https://staging.api.smalltech.in/local/api/v1/issues"
  : "/api/issues";

interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image: string;
  type?: string;
  status?: string;
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null);
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pickMedia = (issue: Issue): string => {
    if (!issue.media_urls || issue.media_urls.length === 0) {
      return "https://via.placeholder.com/150";
    }
    const photo = issue.media_urls.find((item) => item.type === "photo" && item.url);
    return (photo || issue.media_urls[0]).url || "https://via.placeholder.com/150";
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadIssues() {
      try {
        const res = await fetch(ENDPOINT, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload: IssuesResponse = await res.json();
        const issues = payload.data?.issues || [];

        const pins: LocationPin[] = issues
          .filter((issue) => issue.status === "OPEN")
          .filter((issue) => issue.location?.lat && issue.location?.lng)
          .map((issue) => ({
            id: issue.id.toString(),
            lat: issue.location!.lat!,
            lng: issue.location!.lng!,
            title: issue.type || "Issue",
            description: issue.description || "No description available",
            image: pickMedia(issue),
            type: issue.type,
            status: issue.status,
          }));

        setLocations(pins);
        setIsLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to load issues", err);
        setIsLoading(false);
      }
    }

    loadIssues();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || locations.length === 0) return;

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const map = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });

      const bounds = new google.maps.LatLngBounds();

      locations.forEach((location) => {
        const marker = new google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: map,
          title: location.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#FF5733",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        const position = marker.getPosition();
        if (position) bounds.extend(position);

        marker.addListener("click", () => {
          setSelectedLocation(location);
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; max-width: 250px;">
                <img src="${location.image}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px;" />
                <h3 style="margin: 8px 0;">${location.title}</h3>
                <p>${location.description}</p>
                <a href="/issue/${location.id}" style="display:inline-block;margin-top:8px;color:#2563eb;font-weight:600;text-decoration:none;">View details</a>
              </div>
            `,
          });
          infoWindow.open(map, marker);
        });
      });

      if (locations.length > 0) {
        map.fitBounds(bounds);
        google.maps.event.addListenerOnce(map, "idle", () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom < 11) map.setZoom(currentZoom + 1);
        });
      }
      setIsMapLoaded(true);
    };

    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o`;
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, [isLoading, locations]);

  return (
    <div className="map-wrapper">
      {isLoading && (
        <div className="map-loading">
          <p>Loading issues...</p>
        </div>
      )}
      <div ref={mapRef} className={`map-container ${isMapLoaded ? "map-loaded" : ""}`} />
      {selectedLocation && (
        <div className="location-detail-panel">
          <button className="close-button" onClick={() => setSelectedLocation(null)}>
            ✕
          </button>
          <img src={selectedLocation.image} alt={selectedLocation.title} className="detail-image" />
          <h2 className="detail-title">{selectedLocation.title}</h2>
          <p className="detail-description">{selectedLocation.description}</p>
          <p className="detail-coordinates">
            📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </p>
          <a className="detail-link" href={`/issue/${selectedLocation.id}`}>
            View details
          </a>
        </div>
      )}
    </div>
  );
}
