"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";

export interface MapPoint {
  id: string;
  code: string;
  title: string;
  lat: number;
  lng: number;
  priceLabel: string;
}

export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function priceIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:inline-block;white-space:nowrap;background:#10b981;color:#04130d;font:700 12px/1 var(--font-sans);padding:6px 8px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.45)">${label.replace(/[<>&]/g, "")}</div>`,
    iconSize: [0, 0],
  });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function ListingsMap({ points, className }: { points: MapPoint[]; className?: string }) {
  const icons = useMemo(() => new Map(points.map((p) => [p.id, priceIcon(p.priceLabel)])), [points]);
  return (
    <MapContainer center={[13.7563, 100.5018]} zoom={6} scrollWheelZoom className={`dwelly-map ${className ?? ""}`}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.id)!}>
          <Popup>
            <Link href={`/property/${p.code}`} className="block max-w-56 text-sm font-semibold text-gray-900">
              {p.title}
            </Link>
            <span className="text-xs text-emerald-700">{p.priceLabel}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
