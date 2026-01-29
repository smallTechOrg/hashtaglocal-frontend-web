export interface PolygonCoordinate {
  lat: number;
  lng: number;
}

export interface Polygon {
  id: string;
  name: string;
  hashtag: string;
  coordinates: PolygonCoordinate[];
  color: string;
  description?: string;
}

export interface PolygonData {
  polygons: Polygon[];
}
