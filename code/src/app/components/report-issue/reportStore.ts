import { LocationMetadata } from "../../utils/geocoding";

interface ReportStore {
  blob: Blob | null;
  previewUrl: string | null;
  position: GeolocationPosition | null;
  locationMeta: LocationMetadata | null;
}

const store: ReportStore = {
  blob: null,
  previewUrl: null,
  position: null,
  locationMeta: null,
};

export function setReportBlob(blob: Blob, previewUrl: string): void {
  if (store.previewUrl) URL.revokeObjectURL(store.previewUrl);
  store.blob = blob;
  store.previewUrl = previewUrl;
}

export function setReportLocation(
  position: GeolocationPosition,
  meta: LocationMetadata | null,
): void {
  store.position = position;
  store.locationMeta = meta;
}

export function getReportData(): Readonly<ReportStore> {
  return store;
}

export function clearReportData(): void {
  if (store.previewUrl) URL.revokeObjectURL(store.previewUrl);
  store.blob = null;
  store.previewUrl = null;
  store.position = null;
  store.locationMeta = null;
}
