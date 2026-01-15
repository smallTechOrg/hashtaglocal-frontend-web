"use client";
import React, { useEffect, useRef, useState } from "react";
import "./map.css";
import jsonData from "./data.json";

interface RawLocationData {
  lat: number;
  long: number;
  image: string;
  image_thumb: string;
  category: number;
  created_at: string;
}

interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image: string;
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null);

  const getCategoryDescription = (cat: number): string => {
    const descriptions: Record<number, string> = {
      0: "Minor", 1: "Major", 2: "Severe", 3: "Critical",
    };
    return descriptions[cat] || "Unknown severity";
  };

  const locations: LocationPin[] = jsonData.data.map((item: RawLocationData, index: number) => ({
    id: index.toString(),
    lat: item.lat,
    lng: item.long,
    title: "Pothole",
    description: `Category ${item.category}: ${getCategoryDescription(item.category)}`,
    image: item.image,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

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
              </div>
            `,
          });
          infoWindow.open(map, marker);
        });
      });

      if (locations.length > 0) {
        map.fitBounds(bounds);
        google.maps.event.addListenerOnce(map, 'idle', () => {
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
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className={`map-container ${isMapLoaded ? "map-loaded" : ""}`} />
      {/* UI Panels */}
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
        </div>
      )}
    </div>
  );
}