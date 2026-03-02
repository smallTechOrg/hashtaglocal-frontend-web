"use client";
import { useState } from "react";
import ProgressiveImage from "./ProgressiveImage";
import "./ImageSlideshow.css";

export interface SlideImage {
  url: string;
  thumbnail?: string;
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
}

export default function ImageSlideshow({
  images,
  alt,
  imageClassName,
  style,
  onClick,
  loading = "lazy",
  decoding = "async",
}: ImageSlideshowProps) {
  const [current, setCurrent] = useState(0);

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
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrent((c) => (c + 1) % images.length);
  };

  const goTo = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrent(i);
  };

  return (
    <div className="slideshow-root" style={style} onClick={onClick}>
      <ProgressiveImage
        src={images[current].url}
        thumbnail={images[current].thumbnail}
        alt={`${alt} (${current + 1}/${images.length})`}
        className={`slideshow-slide-img ${imageClassName || ""}`}
        loading={loading}
        decoding={decoding}
      />
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
