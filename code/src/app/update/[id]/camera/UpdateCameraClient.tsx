"use client";

import { useEffect, useState } from "react";
import CameraCapture from "../../../components/report-issue/CameraCapture";

export default function UpdateCameraClient() {
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    const match = window.location.pathname.match(/\/update\/([^/]+)\/camera/);
    const id = match?.[1] && match[1] !== "index" ? match[1] : null;
    const type = new URLSearchParams(window.location.search).get("type") ?? "";
    if (id) {
      setNextPath(`/update/${id}/form?type=${encodeURIComponent(type)}`);
    }
  }, []);

  if (!nextPath) return null;
  return <CameraCapture nextPath={nextPath} />;
}
