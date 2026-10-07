"use client";

import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { TILE_ATTRIBUTION, TILE_URL } from "./listings-map";

/** Listing location. When the owner hides the exact pin we show a ~500 m area instead. */
export default function SingleLocationMap({ lat, lng, exact }: { lat: number; lng: number; exact: boolean }) {
  return (
    <MapContainer center={[lat, lng]} zoom={exact ? 15 : 14} scrollWheelZoom={false} className="dwelly-map h-full w-full rounded-3xl">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {exact ? (
        <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.9 }} />
      ) : (
        <Circle center={[lat, lng]} radius={500} pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15 }} />
      )}
    </MapContainer>
  );
}
