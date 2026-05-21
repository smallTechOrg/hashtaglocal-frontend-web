"use client";
import React from "react";
import { X, ArrowLeft, MapPin, Calendar, Clock, ExternalLink } from "lucide-react";
import ImageSlideshow from "../ImageSlideshow";
import ProgressiveImage from "../ProgressiveImage";
import { MapItem } from "./types";
import {
  LAYER_BY_ID,
  formatTimeAgo,
  formatEventDate,
  formatEventTime,
  prettyType,
} from "./layerConfig";

type Props = {
  item: MapItem | null;
  list: MapItem[];
  activeLayerLabel: string;
  onSelect: (item: MapItem) => void;
  onClear: () => void;
  onClose: () => void;
};

function ItemThumb({ item }: { item: MapItem }) {
  const layer = LAYER_BY_ID[item.layer];
  if (item.images.length > 0) {
    const first = item.images[0];
    return (
      <ProgressiveImage
        src={first.url}
        thumbnail={first.thumbnail}
        alt={item.title}
        className="xp-card-img"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className="xp-card-img xp-card-img--empty" style={{ color: layer.color }}>
      <span>{layer.icon}</span>
    </div>
  );
}

function ListCard({
  item,
  onSelect,
}: {
  item: MapItem;
  onSelect: (i: MapItem) => void;
}) {
  const layer = LAYER_BY_ID[item.layer];
  const isEvent = item.layer === "events";
  return (
    <button className="xp-card" onClick={() => onSelect(item)}>
      <div className="xp-card-media">
        <ItemThumb item={item} />
      </div>
      <div className="xp-card-body">
        <div className="xp-card-toprow">
          <span
            className="xp-chip xp-chip--sm"
            style={{ background: layer.color }}
          >
            {prettyType(item.type)}
          </span>
          <span className="xp-card-time">
            {isEvent ? (
              <>
                <Calendar size={11} /> {formatEventDate(item.timestamp)}
              </>
            ) : (
              <>
                <Clock size={11} /> {formatTimeAgo(item.timestamp)}
              </>
            )}
          </span>
        </div>
        <p className="xp-card-title">{item.title}</p>
        <p className="xp-card-loc">
          <MapPin size={11} /> {item.locationLabel}
        </p>
        {item.hashtags && item.hashtags.length > 0 && (
          <p className="xp-card-tags">
            {item.hashtags.slice(0, 3).map((h) => (
              <span key={h} className="xp-tag">
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </p>
        )}
      </div>
    </button>
  );
}

function ItemDetail({
  item,
  onClear,
}: {
  item: MapItem;
  onClear: () => void;
}) {
  const layer = LAYER_BY_ID[item.layer];
  return (
    <div className="xp-detail">
      <button className="xp-back" onClick={onClear}>
        <ArrowLeft size={15} /> Back to {layer.label.toLowerCase()}
      </button>

      {item.images.length > 0 ? (
        <ImageSlideshow
          images={item.images}
          alt={item.title}
          imageClassName="xp-detail-img"
        />
      ) : (
        <div
          className="xp-detail-img xp-detail-img--empty"
          style={{ color: layer.color }}
        >
          <span>{layer.icon}</span>
        </div>
      )}

      <div className="xp-detail-body">
        <span className="xp-chip" style={{ background: layer.color }}>
          {prettyType(item.type)}
        </span>

        {/* Events have a real name; issues use description as title so skip the h3 */}
        {item.layer === "events" && (
          <h3 className="xp-detail-title">{item.title}</h3>
        )}

        <p className="xp-detail-row">
          <MapPin size={14} /> {item.locationLabel}
        </p>

        {item.layer === "events" ? (
          <>
            <p className="xp-detail-row">
              <Calendar size={14} /> {formatEventDate(item.timestamp)}
              {formatEventTime(item.timestamp) &&
                ` · ${formatEventTime(item.timestamp)}`}
            </p>
            {item.organisation && (
              <p className="xp-detail-desc">
                Organised by <strong>{item.organisation}</strong>
              </p>
            )}
            {item.link && (
              <a
                className="xp-cta"
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register / Details <ExternalLink size={15} />
              </a>
            )}
          </>
        ) : (
          <>
            <p className="xp-detail-row">
              <Clock size={14} /> {formatTimeAgo(item.timestamp)}
            </p>
            {item.description && (
              <p className="xp-detail-desc">{item.description}</p>
            )}
            {item.detailHref && (
              <a className="xp-cta" href={item.detailHref}>
                View full issue <ExternalLink size={15} />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DetailPanel({
  item,
  list,
  activeLayerLabel,
  onSelect,
  onClear,
  onClose,
}: Props) {
  return (
    <div className="xp-panel">
      <div className="xp-panel-head">
        <div>
          <p className="xp-panel-eyebrow">{activeLayerLabel}</p>
          <h2 className="xp-panel-heading">
            {item ? "Details" : `${list.length} nearby`}
          </h2>
        </div>
        <button
          className="xp-icon-btn xp-panel-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="xp-panel-scroll">
        {item ? (
          <ItemDetail item={item} onClear={onClear} />
        ) : list.length === 0 ? (
          <p className="xp-empty">Nothing here yet — try another layer or area.</p>
        ) : (
          <div className="xp-card-list">
            {list.map((it) => (
              <ListCard key={`${it.layer}-${it.id}`} item={it} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
