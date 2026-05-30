"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 860;

// Clamp ranges. Desktop = panel width (px); mobile = panel height (px).
const DESKTOP_MIN = 300;
const DESKTOP_MAX_VW = 0.7; // up to 70% of viewport width
const MOBILE_MIN = 160;
const MOBILE_MAX_VH = 0.85; // up to 85% of viewport height

interface ResizablePanel {
  /** Inline style to spread on the panel dock (width on desktop, height on mobile). */
  size: { width?: number; height?: number } | undefined;
  /** Pointer-down handler for the drag handle. */
  startDrag: (e: React.PointerEvent) => void;
  /** True while dragging (for cursor / no-select styling). */
  dragging: boolean;
}

/**
 * Makes the explorer side panel user-resizable by dragging its leading edge. Desktop (≥861px)
 * resizes width (panel docks on the right, so wider = drag left). Mobile resizes height (panel
 * sits below the map, so taller = drag up). Works with mouse and touch via Pointer Events.
 */
export function useResizablePanel(): ResizablePanel {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const isMobileRef = useRef(false);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    isMobileRef.current = isMobile;
    setDragging(true);

    const move = (ev: PointerEvent) => {
      if (isMobileRef.current) {
        // Panel is below the map; dragging up (smaller clientY) makes it taller.
        const h = window.innerHeight - ev.clientY;
        const max = window.innerHeight * MOBILE_MAX_VH;
        setHeight(Math.max(MOBILE_MIN, Math.min(max, h)));
      } else {
        // Panel docks on the right; dragging left (smaller clientX) makes it wider.
        const w = window.innerWidth - ev.clientX;
        const max = window.innerWidth * DESKTOP_MAX_VW;
        setWidth(Math.max(DESKTOP_MIN, Math.min(max, w)));
      }
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);

  // Reset any axis that no longer applies when crossing the breakpoint, so a width set on desktop
  // doesn't leak into the mobile (height-based) layout and vice-versa.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) setWidth(null);
      else setHeight(null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const size =
    width != null
      ? { width }
      : height != null
        ? { height }
        : undefined;

  return { size, startDrag, dragging };
}
