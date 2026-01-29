import { Polygon } from "../models/polygon";

/**
 * Sample polygon data for localities/hashtags
 * These are approximate boundaries for different areas in Bangalore
 */
export const samplePolygons: Polygon[] = [
  {
    id: "1",
    name: "Indiranagar",
    hashtag: "#Indiranagar",
    color: "#FF6B6B",
    description: "Indiranagar locality",
    coordinates: [
      { lat: 12.972, lng: 77.641 },
      { lat: 12.972, lng: 77.655 },
      { lat: 12.960, lng: 77.655 },
      { lat: 12.960, lng: 77.641 },
      { lat: 12.972, lng: 77.641 },
    ],
  },
  {
    id: "2",
    name: "Koramangala",
    hashtag: "#Koramangala",
    color: "#4ECDC4",
    description: "Koramangala locality",
    coordinates: [
      { lat: 12.935, lng: 77.625 },
      { lat: 12.935, lng: 77.640 },
      { lat: 12.920, lng: 77.640 },
      { lat: 12.920, lng: 77.625 },
      { lat: 12.935, lng: 77.625 },
    ],
  },
  {
    id: "3",
    name: "Whitefield",
    hashtag: "#Whitefield",
    color: "#95E1D3",
    description: "Whitefield locality",
    coordinates: [
      { lat: 12.970, lng: 77.740 },
      { lat: 12.970, lng: 77.770 },
      { lat: 12.950, lng: 77.770 },
      { lat: 12.950, lng: 77.740 },
      { lat: 12.970, lng: 77.740 },
    ],
  },
  {
    id: "4",
    name: "MG Road",
    hashtag: "#MGRoad",
    color: "#F38181",
    description: "MG Road locality",
    coordinates: [
      { lat: 12.975, lng: 77.595 },
      { lat: 12.975, lng: 77.610 },
      { lat: 12.960, lng: 77.610 },
      { lat: 12.960, lng: 77.595 },
      { lat: 12.975, lng: 77.595 },
    ],
  },
  {
    id: "5",
    name: "Marathahalli",
    hashtag: "#Marathahalli",
    color: "#AA96DA",
    description: "Marathahalli locality",
    coordinates: [
      { lat: 12.955, lng: 77.700 },
      { lat: 12.955, lng: 77.720 },
      { lat: 12.935, lng: 77.720 },
      { lat: 12.935, lng: 77.700 },
      { lat: 12.955, lng: 77.700 },
    ],
  },
  {
    id: "6",
    name: "Jayanagar",
    hashtag: "#Jayanagar",
    color: "#FCBAD3",
    description: "Jayanagar locality",
    coordinates: [
      { lat: 12.935, lng: 77.595 },
      { lat: 12.935, lng: 77.610 },
      { lat: 12.920, lng: 77.610 },
      { lat: 12.920, lng: 77.595 },
      { lat: 12.935, lng: 77.595 },
    ],
  },
  {
    id: "7",
    name: "Bellandur",
    hashtag: "#Bellandur",
    color: "#A8E6CF",
    description: "Bellandur locality",
    coordinates: [
      { lat: 12.925, lng: 77.685 },
      { lat: 12.925, lng: 77.710 },
      { lat: 12.910, lng: 77.710 },
      { lat: 12.910, lng: 77.685 },
      { lat: 12.925, lng: 77.685 },
    ],
  },
];
