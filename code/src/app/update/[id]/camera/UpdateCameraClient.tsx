"use client";

import { useEffect, useState } from "react";
import CameraCapture from "../../../components/report-issue/CameraCapture";

export default function UpdateCameraClient() {
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    const match = window.location.pathname.match(/\/update\/([^/]+)\/camera/);
    const params = new URLSearchParams(window.location.search);
    const pathId = match?.[1];
    const id = (pathId && pathId !== "index") ? pathId : (params.get("id") ?? null);
    const type = params.get("type") ?? "";
    if (id) {
      setNextPath(`/update/${id}/form?type=${encodeURIComponent(type)}`);
    }
  }, []);

  if (!nextPath) return null;
  return <CameraCapture nextPath={nextPath} />;
}
