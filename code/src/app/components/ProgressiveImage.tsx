"use client";
import { useEffect, useRef, useState } from "react";

interface ProgressiveImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
}

/**
 * Always hides the img until it is ready so the broken-image/alt-text state
 * is never visible.
 *
 * - With thumbnail: shows thumbnail immediately on load, silently preloads the
 *   full image in the background, then swaps src when ready.
 * - Without thumbnail: keeps the image invisible (opacity 0) until the full
 *   image has finished loading, then fades it in.
 */
export default function ProgressiveImage({
  src,
  thumbnail,
  alt,
  className,
  style,
  onClick,
  loading = "lazy",
  decoding = "async",
}: ProgressiveImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!thumbnail) return;

    // Thumbnail is already in the DOM (src={thumbnail || src}).
    // Preload the full image in the background and swap when ready.
    const fullImg = new window.Image();
    fullImg.onload = () => {
      if (imgRef.current) {
        imgRef.current.src = src;
      }
    };
    fullImg.src = src;

    return () => {
      fullImg.onload = null;
    };
  }, [src, thumbnail]);

  return (
    <img
      ref={imgRef}
      src={thumbnail || src}
      alt={alt}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
      onClick={onClick}
      loading={loading}
      decoding={decoding}
      onLoad={() => setVisible(true)}
    />
  );
}
