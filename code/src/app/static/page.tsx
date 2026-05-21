"use client";
import MapExplorer from "../components/explorer/MapExplorer";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";

export default function Static() {
  useScrollTracking();
  useTimeTracking("/");

  return <MapExplorer />;
}
