"use client";
import React, { useEffect, useRef, useState } from "react";
import "./polygons.css";
import { Polygon, PolygonCoordinate } from "../../models/polygon";
import { samplePolygons } from "../../utils/polygonSampleData";

interface PolygonsMapProps {
  polygons?: Polygon[];
}

interface ApiLocality {
  id: number;
  hashtag: string;
  name: string;
  geoBoundary: {
    type: "Polygon";
    coordinates: Array<Array<[number, number]>>;
  };
}

const POLYGON_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3",
  "#A8E6CF",
  "#FFB6B9",
  "#8EC5FC",
  "#FFA07A",
];

const getColorForPolygon = (index: number) => {
  return POLYGON_COLORS[index % POLYGON_COLORS.length];
};

const transformApiData = (apiPolygon: ApiLocality, colorIndex: number): Polygon => {
  // Convert GeoJSON coordinates from [lng, lat] to our format
  const coordinates: PolygonCoordinate[] = apiPolygon.geoBoundary.coordinates[0].map(
    ([lng, lat]) => ({
      lat,
      lng,
    })
  );

  return {
    id: apiPolygon.id.toString(),
    name: apiPolygon.name,
    hashtag: apiPolygon.hashtag,
    coordinates,
    color: getColorForPolygon(colorIndex),
  };
};

const PolygonsMap = ({ polygons: initialPolygons }: PolygonsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polygonShapesRef = useRef<google.maps.Polygon[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPolygon, setSelectedPolygon] = useState<Polygon | null>(null);
  const [polygons, setPolygons] = useState<Polygon[]>(initialPolygons || []);
  const ENDPOINT = "https://staging.api.smalltech.in/local/api/localities/polygons";

  // Fetch polygons from API
  useEffect(() => {
    const fetchPolygons = async () => {
      try {
        const response = await fetch(ENDPOINT);
        if (!response.ok) {
          throw new Error(`Failed to fetch polygons: ${response.status}`);
        }
        const data: ApiLocality[] = await response.json();
        const transformedPolygons = data.map((apiPolygon, index) =>
          transformApiData(apiPolygon, index)
        );
        // Sort alphabetically by hashtag
        transformedPolygons.sort((a, b) => a.hashtag.localeCompare(b.hashtag));
        setPolygons(transformedPolygons);
      } catch (err) {
        console.error("Error fetching polygons:", err);
        // Fall back to sample data if API fails
        const fallback = (initialPolygons || samplePolygons).slice().sort((a, b) => a.hashtag.localeCompare(b.hashtag));
        setPolygons(fallback);
      }
    };

    fetchPolygons();
  }, [initialPolygons]);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: true,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);
      setIsLoading(false);
    };

    if (typeof window === "undefined") return;

    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o";
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, []);

  // Render polygons on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || isLoading) return;

    // Clear existing polygons
    polygonShapesRef.current.forEach((polygon) => polygon.setMap(null));
    polygonShapesRef.current = [];

    const bounds = new google.maps.LatLngBounds();


    // Create a single InfoWindow instance
    const infoWindow = new google.maps.InfoWindow();

    polygons.forEach((polygon) => {
      const paths = polygon.coordinates.map((coord) => ({
        lat: coord.lat,
        lng: coord.lng,
      }));

      const googlePolygon = new google.maps.Polygon({
        paths,
        strokeColor: polygon.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: polygon.color,
        fillOpacity: 0.3,
        map,
      });

      // Add click listener to polygon
      googlePolygon.addListener("click", () => {
        setSelectedPolygon(polygon);
        // Pan to polygon center
        const center = getPolygonCenter(paths);
        map.panTo(center);
        map.setZoom(14);
      });

      // Show name on mouseover
      googlePolygon.addListener("mouseover", (event) => {
        infoWindow.setContent(`<div style='font-weight:bold;font-size:14px;'>${polygon.name}</div>`);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
      // Hide name on mouseout
      googlePolygon.addListener("mouseout", () => {
        infoWindow.close();
      });

      // Extend bounds to include polygon
      paths.forEach((coord) => bounds.extend(coord));

      polygonShapesRef.current.push(googlePolygon);
    });

    // Fit map to bounds
    if (polygons.length > 0) {
      map.fitBounds(bounds);
    }
  }, [isMapLoaded, polygons, isLoading]);

  const getPolygonCenter = (coordinates: google.maps.LatLngLiteral[]) => {
    const lats = coordinates.map((c) => c.lat);
    const lngs = coordinates.map((c) => c.lng);
    const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const avgLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    return { lat: avgLat, lng: avgLng };
  };

  return (
    <div className="polygons-map-container">
      <div className="polygons-map-wrapper">
        {isLoading && (
          <div className="polygons-map-loading">
            <p>Loading map...</p>
          </div>
        )}
        <div className="polygons-map" ref={mapRef}></div>
      </div>

      <div className="polygons-sidebar">
        <div className="polygons-header">
          <div className="polygons-header-top">
            <h2>Localities</h2>
            {selectedPolygon && (
              <button 
                className="polygons-view-all-btn"
                onClick={() => {
                  setSelectedPolygon(null);
                  const map = mapInstanceRef.current;
                  if (map && polygons.length > 0) {
                    const bounds = new google.maps.LatLngBounds();
                    polygons.forEach((polygon) => {
                      polygon.coordinates.forEach((coord) => 
                        bounds.extend({ lat: coord.lat, lng: coord.lng })
                      );
                    });
                    map.fitBounds(bounds);
                  }
                }}
              >
                View All
              </button>
            )}
          </div>
          <p className="polygons-count">{polygons.length} areas</p>
        </div>

        <div className="polygons-list">
          {polygons.map((polygon) => (
            <div
              key={polygon.id}
              className={`polygon-item ${selectedPolygon?.id === polygon.id ? "active" : ""}`}
              onClick={() => {
                setSelectedPolygon(polygon);
                const paths = polygon.coordinates.map((coord) => ({
                  lat: coord.lat,
                  lng: coord.lng,
                }));
                const center = getPolygonCenter(paths);
                mapInstanceRef.current?.panTo(center);
                mapInstanceRef.current?.setZoom(14);
              }}
            >
              <div
                className="polygon-color-indicator"
                style={{ backgroundColor: polygon.color }}
              ></div>
              <div className="polygon-info">
                <p className="polygon-hashtag">{polygon.hashtag}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolygonsMap;
