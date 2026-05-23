"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  SlidersHorizontal,
  Search,
  MapPin,
} from "lucide-react";
import { LAYERS, LayerId, SubFilter } from "./layerConfig";

export interface CityOption {
  label: string;
  value: string;
}

type Props = {
  activeLayer: LayerId;
  onLayerChange: (id: LayerId) => void;
  subFilters: SubFilter[];
  activeSubFilters: Set<string>;
  onToggleSubFilter: (value: string) => void;
  onClearSubFilters: () => void;
  counts: Record<string, number>;
  cities: CityOption[];
  selectedCity: string;
  onCityChange: (value: string) => void;
  citiesLoading: boolean;
};

function useOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

export default function MapControls({
  activeLayer,
  onLayerChange,
  subFilters,
  activeSubFilters,
  onToggleSubFilter,
  onClearSubFilters,
  counts,
  cities,
  selectedCity,
  onCityChange,
  citiesLoading,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filterRef = useOutside<HTMLDivElement>(() => setFilterOpen(false));
  const cityRef = useOutside<HTMLDivElement>(() => {
    setCityOpen(false);
    setQuery("");
  });

  const activeCity =
    cities.find((c) => c.value === selectedCity)?.label ??
    decodeURIComponent(selectedCity);
  const activeCount = activeSubFilters.size;
  const activeLayerLabel = LAYERS.find((l) => l.id === activeLayer)?.label ?? activeLayer;

  return (
    <div className="xp-controls">
      {/* City selector — primary control */}
      <div className="xp-control" ref={cityRef}>
        <button
          className="xp-city-btn"
          onClick={() => {
            setCityOpen((o) => !o);
            setQuery("");
          }}
          disabled={citiesLoading}
        >
          <span className="xp-city-icon">
            <MapPin size={17} />
          </span>
          <span className="xp-city-text">
            <span className="xp-city-eyebrow">Exploring</span>
            <span className="xp-city-label">
              {citiesLoading ? "Loading…" : activeCity}
            </span>
          </span>
          <ChevronDown size={16} className="xp-city-caret" />
        </button>
        {cityOpen && (
          <div className="xp-menu xp-menu--city">
            <div className="xp-menu-search">
              <Search size={14} />
              <input
                autoFocus
                placeholder="Search city…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className="xp-menu-list">
              {cities
                .filter((c) =>
                  c.label.toLowerCase().includes(query.toLowerCase()),
                )
                .map((c) => (
                  <li key={c.value}>
                    <button
                      className={`xp-menu-item ${
                        c.value === selectedCity ? "is-active" : ""
                      }`}
                      onClick={() => {
                        onCityChange(c.value);
                        setCityOpen(false);
                        setQuery("");
                      }}
                    >
                      {c.label}
                      {c.value === selectedCity && <Check size={14} />}
                    </button>
                  </li>
                ))}
              {cities.filter((c) =>
                c.label.toLowerCase().includes(query.toLowerCase()),
              ).length === 0 && (
                <li className="xp-menu-empty">No city found</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Layer segmented toggle */}
      <div className="xp-segment">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            className={`xp-segment-btn ${
              activeLayer === layer.id ? "is-active" : ""
            }`}
            onClick={() => onLayerChange(layer.id)}
            style={
              activeLayer === layer.id
                ? { background: layer.color }
                : undefined
            }
          >
            <span className="xp-segment-dot" style={{ background: layer.color }} />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Sub-filter dropdown */}
      <div className="xp-control" ref={filterRef}>
        <button
          className={`xp-pill ${activeCount > 0 ? "is-active" : ""}`}
          onClick={() => setFilterOpen((o) => !o)}
        >
          <SlidersHorizontal size={14} />
          <span className="xp-pill-label">
            {activeCount > 0 ? `${activeCount} filters` : "Filter"}
          </span>
          <ChevronDown size={14} className="xp-pill-caret" />
        </button>
        {filterOpen && (
          <div className="xp-menu xp-menu--filter">
            <div className="xp-menu-head">
              <span>Categories</span>
              {activeCount > 0 && (
                <button className="xp-menu-clear" onClick={onClearSubFilters}>
                  Clear
                </button>
              )}
            </div>
            <ul className="xp-menu-list">
              {subFilters.map((sf) => {
                const on = activeSubFilters.has(sf.value);
                return (
                  <li key={sf.value}>
                    <button
                      className={`xp-menu-item xp-filter-item ${
                        on ? "is-active" : ""
                      }`}
                      onClick={() => onToggleSubFilter(sf.value)}
                    >
                      <span className="xp-filter-left">
                        <span className="xp-filter-icon">{sf.icon}</span>
                        {sf.label}
                      </span>
                      <span className="xp-filter-right">
                        <span className="xp-filter-count">
                          {counts[sf.value] || 0}
                        </span>
                        {on && <Check size={14} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
