"use client";
import React, { useEffect, useRef, useState } from "react";
import "./map.css";
// Import the local JSON file
import jsonData from "./data.json";

interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: new (...args: unknown[]) => unknown;
      Marker: new (...args: unknown[]) => unknown;
      InfoWindow: new (...args: unknown[]) => unknown;
      LatLngBounds: new (...args: unknown[]) => unknown;
      SymbolPath: {
        CIRCLE: string;
      };
    };
  };
}

// Updated interface to match your local data format
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

  // Helper to map numeric categories to text descriptions
  const getCategoryDescription = (cat: number): string => {
    const descriptions: Record<number, string> = {
      0: "Minor",
      1: "Major",
      2: "Severe",
      3: "Critical",
    };
    return descriptions[cat] || "Unknown severity";
  };

  // Transform JSON data into LocationPin format
  const locations: LocationPin[] = jsonData.data.map((item: RawLocationData, index: number) => ({
    id: index.toString(),
    lat: item.lat,
    lng: item.long, // Mapping 'long' from JSON to 'lng' for Google Maps
    title: "Pothole",
    description: `Category ${item.category}: ${getCategoryDescription(item.category)}`,
    image: item.image,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeMap = () => {
      if (!mapRef.current) return;

      try {
        const map = new (window as GoogleMapsWindow).google!.maps.Map(mapRef.current, {
          zoom: 12,
          center: { lat: 12.9716, lng: 77.5946 }, // Default Bangalore center
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          tilt: 45,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }) as any;

        const bounds = new (window as GoogleMapsWindow).google!.maps.LatLngBounds() as any;

        locations.forEach((location) => {
          const marker = new (window as GoogleMapsWindow).google!.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.title,
            icon: {
              path: (window as GoogleMapsWindow).google!.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#FF5733",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
          }) as any;

          bounds.extend(marker.getPosition());

          marker.addListener("click", () => {
            setSelectedLocation(location);

            const infoWindow = new (window as GoogleMapsWindow).google!.maps.InfoWindow({
              content: `
                <div style="padding: 12px; max-width: 200px; font-family: sans-serif;">
                  <img src="${location.image}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;" />
                  <h3 style="margin: 8px 0 4px; font-size: 14px;">${location.title}</h3>
                  <p style="margin: 0; font-size: 12px; color: #d32f2f; font-weight: bold;">${location.description}</p>
                </div>
              `,
            }) as any;

            infoWindow.open(map, marker);
          });
        });

        // Fit map to markers if we have data
        if (locations.length > 0) {
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }

        setIsMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    const checkAndInitialize = () => {
      if ((window as GoogleMapsWindow).google?.maps) {
        initializeMap();
      } else {
        setTimeout(checkAndInitialize, 500);
      }
    };

    if (!(window as GoogleMapsWindow).google?.maps) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o`;
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      checkAndInitialize();
    }
  }, []); // Dependencies left empty so it runs once

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className={`map-container ${isMapLoaded ? "map-loaded" : ""}`} />
      
      {selectedLocation && (
        <div className="location-detail-panel">
          <button className="close-button" onClick={() => setSelectedLocation(null)}>✕</button>
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