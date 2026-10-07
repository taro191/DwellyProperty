"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { TILE_ATTRIBUTION, TILE_URL } from "./listings-map";

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Click the map to drop the listing pin; writes hidden lat/lng inputs for the form. */
export default function LocationPicker({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [pos, setPos] = useState<[number, number] | null>(lat != null && lng != null ? [lat, lng] : null);
  return (
    <div className="space-y-2">
      <div className="h-72 overflow-hidden rounded-2xl border border-line">
        <MapContainer center={pos ?? [13.7946, 100.3237]} zoom={pos ? 15 : 11} className="dwelly-map h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickHandler onPick={(a, b) => setPos([Number(a.toFixed(6)), Number(b.toFixed(6))])} />
          {pos && <CircleMarker center={pos} radius={10} pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.9 }} />}
        </MapContainer>
      </div>
      <input type="hidden" name="lat" value={pos?.[0] ?? ""} />
      <input type="hidden" name="lng" value={pos?.[1] ?? ""} />
      <p className="text-xs text-subtle">
        {pos ? `ตำแหน่ง: ${pos[0]}, ${pos[1]}` : "แตะบนแผนที่เพื่อปักหมุดตำแหน่งทรัพย์"}
        {pos && (
          <button type="button" onClick={() => setPos(null)} className="ml-2 text-accent underline">ล้างหมุด</button>
        )}
      </p>
    </div>
  );
}
