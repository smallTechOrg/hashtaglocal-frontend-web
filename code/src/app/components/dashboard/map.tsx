"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./map.css";
import { Issue, IssueType } from "../../models/issue";
import FeaturedIssues from "./featuredIssues";
import { LocationPin } from "./mapTypes";
import { trackMapMarkerClick, trackError, EventCategory } from "../../utils/analytics";
import { toIssueSlug } from "../../../utils/issueSlug";
import ImageSlideshow from "../ImageSlideshow";
import { useClickTracking } from "../../hooks/useClickTracking";
import { API_PATHS } from "../../constants/api";

interface IssuesResponse {
  data?: {
    issues?: Issue[];
  };
}



const PLACEHOLDER_IMAGE = "https://via.placeholder.com/150";

type MapProps = {
  selectedType: IssueType | "ALL";
  selectedCity: string;
};

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return "Unknown date";

  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const pickMedia = (issue: Issue): { url: string; thumbnail?: string } => {
  if (!issue.media_urls || issue.media_urls.length === 0) return { url: PLACEHOLDER_IMAGE };
  const photo = issue.media_urls.find((item) => item.type === "photo" && item.url);
  const item = photo || issue.media_urls[0];
  return { url: item.url || PLACEHOLDER_IMAGE, thumbnail: item.url_thumbnail };
};

const normalizeType = (type?: string) => (type ? type.toUpperCase() : "OTHER");

const getLocationLabel = (pin: LocationPin) =>
  pin.colloquialName || pin.address || `Lat ${pin.lat.toFixed(3)}, Lng ${pin.lng.toFixed(3)}`;

export default function Map({ selectedType, selectedCity }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null);
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const trackClick = useClickTracking();

  useEffect(() => {
    const controller = new AbortController();

    async function loadIssues() {
      try {
        const endpoint = `${API_PATHS.issues}?locality=${selectedCity}`;
        const res = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload: IssuesResponse = await res.json();
        const issues = payload.data?.issues || [];

        const pins: LocationPin[] = issues
          .filter((issue) => issue.status === "OPEN")
          .filter((issue) => issue.location?.lat && issue.location?.lng)
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          })
          .map((issue) => {
            const { url: imageUrl, thumbnail: imageThumbnail } = pickMedia(issue);
            const images = (issue.media_urls || [])
              .filter((m) => m.url)
              .map((m) => ({ url: m.url!, thumbnail: m.url_thumbnail }));
            return {
              id: issue.id.toString(),
              lat: issue.location!.lat!,
              lng: issue.location!.lng!,
              title: issue.type || "Issue",
              description: issue.description || "No description available",
              image: imageUrl,
              imageThumbnail,
              images: images.length > 0 ? images : undefined,
              type: issue.type,
              status: issue.status,
              createdAt: issue.created_at,
              address: issue.location?.address,
              colloquialName: issue.location?.colloquial_name,
              hashtags: issue.location?.locality?.hashtags,
            };
          });

        setLocations(pins);
        setIsLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to load issues", err);
        trackError('api_load_error', String(err), 'map_component');
        setIsLoading(false);
      }
    }

    loadIssues();
    return () => controller.abort();
  }, [selectedCity]);

  const filteredLocations = useMemo(() => {
    if (selectedType === "ALL") return locations;
    return locations.filter((location) => normalizeType(location.type) === selectedType);
  }, [locations, selectedType]);

  useEffect(() => {
    if (selectedLocation && !filteredLocations.some((loc) => loc.id === selectedLocation.id)) {
      setSelectedLocation(null);
    }
  }, [filteredLocations, selectedLocation]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);
    };

    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o";
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, [isLoading]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    filteredLocations.forEach((location) => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
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
        trackMapMarkerClick(location.id, location.type);
        setSelectedLocation(location);
        map.panTo({ lat: location.lat, lng: location.lng });
      });

      markersRef.current.push(marker);
    });

    if (filteredLocations.length > 0) {
      map.fitBounds(bounds);
      google.maps.event.addListenerOnce(map, "idle", () => {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom < 11) map.setZoom(currentZoom + 1);
      });
    }
  }, [filteredLocations, isMapLoaded]);

  const latestIssues = filteredLocations.slice(0, 10);

  return (
    <div className="map-layout">
      <div className="map-wrapper">
        {isLoading && (
          <div className="map-loading">
            <p>Loading issues...</p>
          </div>
        )}
        <div ref={mapRef} className={`map-container ${isMapLoaded ? "map-loaded" : ""}`} />
      </div>

      <aside className="map-side-panel">
        {selectedLocation ? (
          <div className="detail-card">
            <button 
              className="back-button" 
              onClick={() => {
                trackClick('Back to Latest Issues', EventCategory.NAVIGATION);
                setSelectedLocation(null);
              }}
            >
              ← Back to latest
            </button>
            <ImageSlideshow
              images={
                selectedLocation.images && selectedLocation.images.length > 0
                  ? selectedLocation.images
                  : [{ url: selectedLocation.image, thumbnail: selectedLocation.imageThumbnail }]
              }
              alt={selectedLocation.title}
              imageClassName="detail-image"
            />
            <div className="detail-pill-row">
              {selectedLocation.type && <span className="issue-pill">{selectedLocation.type}</span>}
            </div>
            <p className="detail-location">{getLocationLabel(selectedLocation)}</p>
            <p className="detail-meta">📍 {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
            <p className="detail-description">{selectedLocation.description}</p>
            <p className="detail-meta">{formatTimeAgo(selectedLocation.createdAt)}</p>
            <a 
              className="detail-link" 
              href={`/issue/${toIssueSlug(selectedLocation.id, selectedLocation.type, selectedLocation.hashtags, selectedLocation.colloquialName || selectedLocation.address)}`}
              onClick={() => {
                trackClick(`View Issue Details from Map ${selectedLocation.id}`, EventCategory.ISSUE, {
                  issue_id: String(selectedLocation.id),
                  issue_type: selectedLocation.type || 'unknown',
                  source: 'map_detail_card'
                });
              }}
            >
              View details
            </a>
          </div>
        ) : (
          <FeaturedIssues
            latestIssues={latestIssues}
            onSelectIssue={setSelectedLocation}
            formatTimeAgo={formatTimeAgo}
            getLocationLabel={getLocationLabel}
          />
        )}
      </aside>
    </div>
  );
}
