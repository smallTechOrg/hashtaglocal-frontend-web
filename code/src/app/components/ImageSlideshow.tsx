"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ProgressiveImage from "./ProgressiveImage";
import "./ImageSlideshow.css";

export interface SlideImage {
  url: string;
  thumbnail?: string;
  description?: string;
}

interface ImageSlideshowProps {
  images: SlideImage[];
  alt: string;
  /** Class applied to the <img> element (single image) or wrapper div (multiple images) */
  imageClassName?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  /** Auto-advance interval in ms. 0 or undefined = no auto-play */
  autoPlayMs?: number;
  /** Called whenever the active slide index changes */
  onSlideChange?: (index: number) => void;
}

export default function ImageSlideshow({
  images,
  alt,
  imageClassName,
  style,
  onClick,
  loading = "lazy",
  decoding = "async",
  autoPlayMs,
  onSlideChange,
}: ImageSlideshowProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onSlideChange?.(current);
  }, [current, onSlideChange]);

  const resetAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlayMs && images.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % images.length);
      }, autoPlayMs);
    }
  }, [autoPlayMs, images.length]);

  useEffect(() => {
    resetAutoPlay();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetAutoPlay]);

  if (!images || images.length === 0) return null;

  // Single image — render ProgressiveImage directly, preserving className on the <img>
  if (images.length === 1) {
    return (
      <ProgressiveImage
        src={images[0].url}
        thumbnail={images[0].thumbnail}
        alt={alt}
        className={imageClassName}
        style={style}
        onClick={onClick}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrent((c) => (c - 1 + images.length) % images.length);
    resetAutoPlay();
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrent((c) => (c + 1) % images.length);
    resetAutoPlay();
  };

  const goTo = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrent(i);
    resetAutoPlay();
  };

  return (
    <div className="slideshow-root" style={style} onClick={onClick}>
      <div className="slideshow-track">
        {images.map((img, i) => (
          <div
            key={i}
            className={`slideshow-slide${i === current ? " slideshow-slide--active" : ""}`}
          >
            <ProgressiveImage
              src={img.url}
              thumbnail={img.thumbnail}
              alt={`${alt} (${i + 1}/${images.length})`}
              className={`slideshow-slide-img ${imageClassName || ""}`}
              loading={i === 0 ? loading : "lazy"}
              decoding={decoding}
            />
          </div>
        ))}
      </div>
      <button
        className="slideshow-btn slideshow-prev"
        onClick={prev}
        aria-label="Previous image"
        type="button"
      >
        ‹
      </button>
      <button
        className="slideshow-btn slideshow-next"
        onClick={next}
        aria-label="Next image"
        type="button"
      >
        ›
      </button>
      <div className="slideshow-dots" aria-label="Image navigation">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`slideshow-dot${i === current ? " active" : ""}`}
            onClick={(e) => goTo(i, e)}
            aria-label={`Image ${i + 1} of ${images.length}`}
          />
        ))}
      </div>
    </div>
  );
}
