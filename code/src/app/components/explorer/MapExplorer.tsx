"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./explorer.css";
import { useMapData } from "./useMapData";
import { MapItem } from "./types";
import MapControls, { CityOption } from "./MapControls";
import DetailPanel from "./DetailPanel";
import ChatView from "./ChatView";
import AuthWidget from "./AuthWidget";
import { useResizablePanel } from "./useResizablePanel";
import {
  LAYER_BY_ID,
  LayerId,
  MapFilterId,
  normalizeType,
} from "./layerConfig";
import {
  trackMapMarkerClick,
  trackIssueFilter,
} from "../../utils/analytics";
import ReportIssueButton from "../report-issue/ReportIssueButton";

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
  const { issues, events, loading } = useMapData();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // What's plotted on the map. "all" = issues + events together (the default).
  const [mapFilter, setMapFilter] = useState<MapFilterId>("all");
  // Per-type category sub-filters (only used when mapFilter is issues/events).
  const [subFilters, setSubFilters] = useState<Record<LayerId, Set<string>>>({
    issues: new Set(),
    events: new Set(),
  });
  const [selectedCity, setSelectedCity] = useState("%23india");
  // The panel shows Chat by default; selecting an item swaps it to that item's detail.
  // "Back" clears selection → returns to Chat.
  const [selected, setSelected] = useState<MapItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const { size: panelSize, startDrag, dragging } = useResizablePanel();

  // Returning from a chat sign-in (?tab=chat) just ensures the panel is open on Chat.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "chat") {
      setSelected(null);
      setPanelOpen(true);
    }
  }, []);

  // City options derived from both datasets.
  const cities: CityOption[] = useMemo(() => {
    const set = new Set<string>();
    [...issues, ...events].forEach((it) =>
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
  }, [issues, events]);

  // Items in the selected city, per dataset.
  const cityIssues = useMemo(
    () => issues.filter((it) => cityMatches(it, selectedCity)),
    [issues, selectedCity],
  );
  const cityEvents = useMemo(
    () => events.filter((it) => cityMatches(it, selectedCity)),
    [events, selectedCity],
  );

  // Inline counts shown on the All/Issues/Events segment.
  const filterCounts: Record<MapFilterId, number> = useMemo(
    () => ({
      all: cityIssues.length + cityEvents.length,
      issues: cityIssues.length,
      events: cityEvents.length,
    }),
    [cityIssues.length, cityEvents.length],
  );

  // Category sub-filter counts for the active single-type filter (issues/events only).
  const activeLayer: LayerId | null =
    mapFilter === "issues" ? "issues" : mapFilter === "events" ? "events" : null;
  const activeSubFilters = activeLayer ? subFilters[activeLayer] : new Set<string>();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    const src = mapFilter === "events" ? cityEvents : cityIssues;
    src.forEach((it) => {
      const t = normalizeType(it.type);
      c[t] = (c[t] || 0) + 1;
    });
    return c;
  }, [mapFilter, cityIssues, cityEvents]);

  // Final visible markers: city + map filter + (per-type) category sub-filter.
  const visibleItems = useMemo(() => {
    let base: MapItem[];
    if (mapFilter === "all") base = [...cityIssues, ...cityEvents];
    else if (mapFilter === "issues") base = cityIssues;
    else base = cityEvents;

    if (activeLayer && activeSubFilters.size > 0) {
      base = base.filter((it) => activeSubFilters.has(normalizeType(it.type)));
    }
    return base;
  }, [mapFilter, cityIssues, cityEvents, activeLayer, activeSubFilters]);

  // Clear selection if the selected item falls out of the visible set.
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

  // Per-item marker icon — keyed on the item's own layer (so issues + events differ on "All").
  const markerIcon = (
    item: MapItem,
    selectedMarker: boolean,
  ): google.maps.Symbol => ({
    path:
      item.layer === "events"
        ? "M -8 -2 L 0 -10 L 8 -2 L 8 8 L -8 8 Z"
        : google.maps.SymbolPath.CIRCLE,
    scale: item.layer === "events" ? 1.1 : selectedMarker ? 13 : 10,
    fillColor: LAYER_BY_ID[item.layer].color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: selectedMarker ? 3 : 2,
  });

  // Render markers + fit bounds — only when the visible set changes.
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
        icon: markerIcon(item, false),
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
  }, [visibleItems, isMapLoaded]);

  // Restyle markers for the selected item without rebuilding the set.
  useEffect(() => {
    markersRef.current.forEach((marker, key) => {
      const isSel = selected
        ? key === `${selected.layer}-${selected.id}`
        : false;
      const [layer] = key.split("-") as [LayerId];
      marker.setIcon(
        markerIcon({ layer } as MapItem, isSel),
      );
      marker.setZIndex(isSel ? 999 : 1);
    });
  }, [selected, isMapLoaded]);

  const handleMapFilterChange = (id: MapFilterId) => {
    setMapFilter(id);
  };

  const handleToggleSubFilter = (value: string) => {
    if (!activeLayer) return;
    setSubFilters((prev) => {
      const next = new Set(prev[activeLayer]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      trackIssueFilter("map_layer_filter", `${activeLayer}:${value}`);
      return { ...prev, [activeLayer]: next };
    });
  };

  const handleClearSubFilters = () => {
    if (!activeLayer) return;
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

  const chatHashtag = decodeURIComponent(selectedCity).replace(/^#/, "");

  // Collapsed-rail label/accent: Chat on "All", otherwise the active layer.
  const panelLabel = activeLayer ? LAYER_BY_ID[activeLayer].label : "Chat";
  const panelAccent = activeLayer ? LAYER_BY_ID[activeLayer].color : "#10B981";

  // Switching tabs resets any open item detail so the panel reflects the new tab cleanly.
  useEffect(() => {
    setSelected(null);
  }, [mapFilter]);

  return (
    <div className={`xp-shell ${panelOpen ? "xp-shell--panel" : ""}`}>
      <div className="xp-map-area">
        {(loading || !isMapLoaded) && (
          <div className="xp-map-loading">
            <span className="xp-spinner" />
            <p>Loading the map…</p>
          </div>
        )}
        {/* The map is always visible. */}
        <div
          ref={mapRef}
          className={`xp-map ${isMapLoaded ? "is-ready" : ""}`}
        />

        {/* Auth status — pinned to the map, always visible. */}
        <div className="xp-auth-wrap">
          <AuthWidget />
        </div>

        <div className="xp-controls-wrap">
          <MapControls
            mapFilter={mapFilter}
            onMapFilterChange={handleMapFilterChange}
            filterCounts={filterCounts}
            subFilters={activeLayer ? LAYER_BY_ID[activeLayer].subFilters : []}
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

        {/* Report Issue — bottom-center CTA */}
        <div className={`xp-report-btn-bottom${panelOpen ? "" : " is-panel-collapsed"}`}>
          <ReportIssueButton variant="map-bottom" />
        </div>
      </div>

      <aside
        className={`xp-panel-dock ${panelOpen ? "" : "is-collapsed"} ${dragging ? "is-dragging" : ""}`}
        style={panelOpen ? panelSize : undefined}
      >
        {/* Drag handle to resize the panel (width on desktop, height on mobile). */}
        {panelOpen && (
          <div
            className={`xp-resize-handle ${dragging ? "is-dragging" : ""}`}
            onPointerDown={startDrag}
            role="separator"
            aria-label="Resize panel"
          />
        )}

        {/* Collapsed rail: a single toggle to reopen the panel. Label reflects the active tab —
            Chat on "All", otherwise the layer name. */}
        {!panelOpen && (
          <div className="xp-tabs" role="tablist" aria-orientation="vertical">
            <button
              role="tab"
              aria-selected={false}
              className="xp-tab"
              onClick={() => setPanelOpen(true)}
              style={{ color: panelAccent }}
            >
              <span className="xp-tab-bar" style={{ background: panelAccent }} />
              <span className="xp-tab-label">{panelLabel}</span>
            </button>
          </div>
        )}

        {panelOpen && (
          <div className="xp-panel-host">
            {mapFilter === "all" ? (
              // "All" tab → Chat by default; a clicked marker swaps to its detail, Back → Chat.
              selected ? (
                <DetailPanel
                  item={selected}
                  list={[]}
                  activeLayerLabel={LAYER_BY_ID[selected.layer].label}
                  onSelect={handleSelect}
                  onClear={() => setSelected(null)}
                  onClose={() => setPanelOpen(false)}
                  backLabel="chat"
                />
              ) : (
                <ChatView hashtag={chatHashtag} onClose={() => setPanelOpen(false)} />
              )
            ) : (
              // "Issues"/"Events" tab → the list+detail panel for that type.
              <DetailPanel
                item={selected}
                list={visibleItems}
                activeLayerLabel={activeLayer ? LAYER_BY_ID[activeLayer].label : ""}
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
