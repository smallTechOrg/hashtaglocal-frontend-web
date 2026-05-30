"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./explorer.css";
import { useMapData } from "./useMapData";
import { MapItem } from "./types";
import MapControls, { CityOption } from "./MapControls";
import DetailPanel from "./DetailPanel";
import ChatView from "./ChatView";
import {
  LAYER_BY_ID,
  LAYERS,
  LayerId,
  normalizeType,
} from "./layerConfig";
import {
  trackMapMarkerClick,
  trackIssueFilter,
} from "../../utils/analytics";

const GOOGLE_MAPS_SRC =
  "https://maps.googleapis.com/maps/api/js?key=AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o";

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

function cityMatches(item: MapItem, city: string): boolean {
  if (city === "%23india") return true;
  const target = decodeURIComponent(city).toLowerCase().replace(/^#/, "");
  return (item.hashtags || []).some(
    (h) => h.toLowerCase().replace(/^#/, "") === target,
  );
}

export default function MapExplorer() {
  const { issues, events, chat, loading } = useMapData();

  // Resolve the dataset for a layer id.
  const datasetFor = (id: LayerId): MapItem[] =>
    id === "issues" ? issues : id === "events" ? events : chat;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const [activeLayer, setActiveLayer] = useState<LayerId>("issues");
  const [subFilters, setSubFilters] = useState<Record<LayerId, Set<string>>>({
    issues: new Set(),
    events: new Set(),
    chat: new Set(),
  });
  const [selectedCity, setSelectedCity] = useState("%23india");
  const [selected, setSelected] = useState<MapItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  // Chat is NOT a map layer — when active it takes over the content area as a chat panel.
  const isChat = activeLayer === "chat";
  const allForLayer = datasetFor(activeLayer);
  const activeSubFilters = subFilters[activeLayer];

  // City options derived from all datasets.
  const cities: CityOption[] = useMemo(() => {
    const set = new Set<string>();
    [...issues, ...events, ...chat].forEach((it) =>
      (it.hashtags || []).forEach((h) => set.add(h.toLowerCase())),
    );
    return [
      { label: "#india", value: "%23india" },
      ...Array.from(set)
        .sort()
        .map((tag) => ({
          label: tag.startsWith("#") ? tag : `#${tag}`,
          value: encodeURIComponent(tag),
        })),
    ];
  }, [issues, events, chat]);

  // Items filtered by city only — used for sub-filter counts.
  const cityItems = useMemo(
    () => allForLayer.filter((it) => cityMatches(it, selectedCity)),
    [allForLayer, selectedCity],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    cityItems.forEach((it) => {
      const t = normalizeType(it.type);
      c[t] = (c[t] || 0) + 1;
    });
    return c;
  }, [cityItems]);

  // Final visible items: city + sub-filter. Chat plots no markers.
  const visibleItems = useMemo(() => {
    if (isChat) return [];
    if (activeSubFilters.size === 0) return cityItems;
    return cityItems.filter((it) =>
      activeSubFilters.has(normalizeType(it.type)),
    );
  }, [isChat, cityItems, activeSubFilters]);

  // Clear selection if it falls out of view.
  useEffect(() => {
    if (
      selected &&
      !visibleItems.some(
        (it) => it.id === selected.id && it.layer === selected.layer,
      )
    ) {
      setSelected(null);
    }
  }, [visibleItems, selected]);

  // Init Google Map.
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;

    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        zoom: 5,
        center: { lat: 20.5937, lng: 78.9629 },
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        styles: MAP_STYLES,
        gestureHandling: "greedy",
      });
      mapInstanceRef.current = map;
      setIsMapLoaded(true);
    };

    if (!window.google) {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_MAPS_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", init);
      } else {
        const script = document.createElement("script");
        script.src = GOOGLE_MAPS_SRC;
        script.async = true;
        script.onload = init;
        document.head.appendChild(script);
      }
    } else {
      init();
    }
  }, [loading]);

  const markerIcon = (selectedMarker: boolean): google.maps.Symbol => ({
    path:
      activeLayer === "events"
        ? "M -8 -2 L 0 -10 L 8 -2 L 8 8 L -8 8 Z"
        : google.maps.SymbolPath.CIRCLE,
    scale: activeLayer === "events" ? 1.1 : selectedMarker ? 13 : 10,
    fillColor: LAYER_BY_ID[activeLayer].color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: selectedMarker ? 3 : 2,
  });

  // Render markers + fit bounds — only when the visible set or layer changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();

    visibleItems.forEach((item) => {
      const marker = new google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map,
        title: item.title,
        icon: markerIcon(false),
      });
      bounds.extend({ lat: item.lat, lng: item.lng });

      marker.addListener("click", () => {
        trackMapMarkerClick(item.id, item.type);
        setSelected(item);
        setPanelOpen(true);
        map.panTo({ lat: item.lat, lng: item.lng });
      });
      markersRef.current.set(`${item.layer}-${item.id}`, marker);
    });

    if (visibleItems.length > 0) {
      map.fitBounds(bounds, 80);
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z && z > 14) map.setZoom(14);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, isMapLoaded, activeLayer]);

  // Restyle markers for the selected item without rebuilding the set.
  useEffect(() => {
    markersRef.current.forEach((marker, key) => {
      const isSel = selected
        ? key === `${selected.layer}-${selected.id}`
        : false;
      marker.setIcon(markerIcon(isSel));
      marker.setZIndex(isSel ? 999 : 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isMapLoaded]);

  const handleLayerChange = (id: LayerId) => {
    setActiveLayer(id);
    setSelected(null);
    setPanelOpen(true);
  };

  // Vertical tab rail: switch layer, or collapse if the active tab is re-clicked.
  const handleTabClick = (id: LayerId) => {
    if (id === activeLayer) {
      setPanelOpen((open) => !open);
      return;
    }
    setActiveLayer(id);
    setSelected(null);
    setPanelOpen(true);
  };

  const handleToggleSubFilter = (value: string) => {
    setSubFilters((prev) => {
      const next = new Set(prev[activeLayer]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      trackIssueFilter("map_layer_filter", `${activeLayer}:${value}`);
      return { ...prev, [activeLayer]: next };
    });
  };

  const handleClearSubFilters = () => {
    setSubFilters((prev) => ({ ...prev, [activeLayer]: new Set() }));
  };

  const handleSelect = (item: MapItem) => {
    setSelected(item);
    const map = mapInstanceRef.current;
    if (map) {
      map.panTo({ lat: item.lat, lng: item.lng });
      const z = map.getZoom();
      if (z && z < 11) map.setZoom(13);
    }
  };

  return (
    <div className={`xp-shell ${panelOpen ? "xp-shell--panel" : ""}`}>
      <div className="xp-map-area">
        {(loading || !isMapLoaded) && (
          <div className="xp-map-loading">
            <span className="xp-spinner" />
            <p>Loading the map…</p>
          </div>
        )}
        {/* The map is always visible — every tab, including Chat. */}
        <div
          ref={mapRef}
          className={`xp-map ${isMapLoaded ? "is-ready" : ""}`}
        />

        <div className="xp-controls-wrap">
          <MapControls
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
            subFilters={LAYER_BY_ID[activeLayer].subFilters}
            activeSubFilters={activeSubFilters}
            onToggleSubFilter={handleToggleSubFilter}
            onClearSubFilters={handleClearSubFilters}
            counts={counts}
            cities={cities}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            citiesLoading={loading}
          />
        </div>

        {/* Legend — map layers only; Chat is a panel, not a map filter. */}
        <div className="xp-legend">
          {LAYERS.filter((l) => l.id !== "chat").map((l) => (
            <span
              key={l.id}
              className={`xp-legend-item ${
                activeLayer === l.id ? "is-active" : ""
              }`}
            >
              <span
                className="xp-legend-dot"
                style={{ background: l.color }}
              />
              {l.label}
              <span className="xp-legend-count">
                {l.id === activeLayer
                  ? visibleItems.length
                  : datasetFor(l.id).filter((it) =>
                      cityMatches(it, selectedCity),
                    ).length}
              </span>
            </span>
          ))}
        </div>

      </div>

      <aside className={`xp-panel-dock ${panelOpen ? "" : "is-collapsed"}`}>
        {/* Vertical tab rail — always visible, switches layer + toggles panel */}
        <div className="xp-tabs" role="tablist" aria-orientation="vertical">
          {LAYERS.map((layer) => {
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                role="tab"
                aria-selected={isActive && panelOpen}
                className={`xp-tab ${
                  isActive && panelOpen ? "is-active" : ""
                }`}
                onClick={() => handleTabClick(layer.id)}
                style={
                  isActive && panelOpen
                    ? { color: layer.color }
                    : undefined
                }
              >
                <span
                  className="xp-tab-bar"
                  style={{ background: layer.color }}
                />
                <span className="xp-tab-label">{layer.label}</span>
              </button>
            );
          })}
        </div>

        {panelOpen && (
          <div className="xp-panel-host">
            {isChat ? (
              <ChatView hashtag={decodeURIComponent(selectedCity).replace(/^#/, "")} />
            ) : (
              <DetailPanel
                item={selected}
                list={visibleItems}
                activeLayerLabel={LAYER_BY_ID[activeLayer].label}
                onSelect={handleSelect}
                onClear={() => setSelected(null)}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
