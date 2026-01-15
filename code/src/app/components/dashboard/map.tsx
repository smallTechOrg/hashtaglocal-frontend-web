"use client";
import React, { useEffect, useRef, useState } from "react";
import "./map.css";

interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image: string;
}

// Sample locations in Bangalore with mock data
const sampleLocations: LocationPin[] = [
  {
    id: "1",
    lat: 12.9716,
    lng: 77.5946,
    title: "Pothole",
    description: "CV Raman Road",
    image: "https://cdn.cartoq.com/photos/small_massive_pothole_on_bengaluru_road_3c27b25fc1.jpg",
  },
  {
    id: "2",
    lat: 12.9352,
    lng: 77.624,
    title: "Pothole",
    description: "100 Feet Road",
    image: "https://cdn.cartoq.com/photos/small_massive_pothole_on_bengaluru_road_3c27b25fc1.jpg",
  },
  {
    id: "3",
    lat: 12.9152,
    lng: 77.624,
    title: "Pothole",
    description: "100 Feet Road",
    image: "https://cdn.cartoq.com/photos/small_massive_pothole_on_bengaluru_road_3c27b25fc1.jpg",
  },
   {
    id: "5",
    lat: 12.9416,
    lng: 77.5846,
    title: "Garbage Dump",
    description: "Sarjapur Road",
    image: "https://erns72xipwt.exactdn.com/wp-content/uploads-new/2025/08/Garbage-blackspots_HSR-Layout_Bengaluru_August-2025_Gangadharan-B-1-1024x769.jpg?strip=all&lossy=1&ssl=1",
  },
  {
    id: "4",
    lat: 12.9416,
    lng: 77.5946,
    title: "Garbage Dump",
    description: "Sarjapur Road",
    image: "https://erns72xipwt.exactdn.com/wp-content/uploads-new/2025/08/Garbage-blackspots_HSR-Layout_Bengaluru_August-2025_Gangadharan-B-1-1024x769.jpg?strip=all&lossy=1&ssl=1",
  }
];

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(
    null
  );

  useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof window === "undefined") return;

    const initializeMap = () => {
      if (!mapRef.current) {
        console.warn("Map ref not available");
        return;
      }

      try {
        const center = { lat: 12.9352, lng: 77.6245 };

        const map = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 12,
          center: center,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          tilt: 45, // Enable 3D view with 45-degree tilt
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }], // Hide landmark labels
            },
          ],
        });

        // Add markers for each location
        const bounds = new (window as any).google.maps.LatLngBounds();

        sampleLocations.forEach((location) => {
          const marker = new (window as any).google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.title,
            icon: {
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              scale: 12, 
              fillColor: "#FF5733", 
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
          });

          // Extend bounds to include this marker
          bounds.extend(marker.getPosition());

          // Add click listener to marker
          marker.addListener("click", () => {
            setSelectedLocation(location);

            // Create info window content
            const infoWindow = new (window as any).google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; max-width: 250px;">
                  <img src="${location.image}" alt="${location.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />
                  <h3 style="margin: 8px 0; font-size: 16px; font-weight: bold;">${location.title}</h3>
                  <p style="margin: 4px 0; font-size: 14px; color: #666;">${location.description}</p>
                  <p style="margin: 8px 0; font-size: 12px; color: #999;">Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}</p>
                </div>
              `,
            });

            infoWindow.open(map, marker);
          });
        });

        // Auto-zoom to fit all markers with padding
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

        setIsMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    const checkAndInitialize = () => {
      if ((window as any).google && (window as any).google.maps) {
        initializeMap();
      } else {
        // Retry after a short delay
        setTimeout(checkAndInitialize, 500);
      }
    };

    // Load Google Maps API script
    if (!((window as any).google && (window as any).google.maps)) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o`;
      script.async = true;
      script.defer = false;
      script.onload = () => {
        initializeMap();
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
      };
      document.head.appendChild(script);
    } else {
      checkAndInitialize();
    }
  }, [setSelectedLocation]);

  return (
    <div className="map-wrapper">
      <div
        ref={mapRef}
        className={`map-container ${isMapLoaded ? "map-loaded" : ""}`}
      />
      {selectedLocation && (
        <div className="location-detail-panel">
          <button
            className="close-button"
            onClick={() => setSelectedLocation(null)}
          >
            ✕
          </button>
          <img
            src={selectedLocation.image}
            alt={selectedLocation.title}
            className="detail-image"
          />
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
