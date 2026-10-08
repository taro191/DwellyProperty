"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";
import { TILE_ATTRIBUTION, TILE_URL } from "./listings-map";

export interface PinPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  land: boolean;
  star: boolean;
}

const esc = (s: string) => s.replace(/[<>&"]/g, "");

/** Price bubble + pointer, styled like the prototype map pins (design: Rx). */
function pinIcon(p: PinPoint, selected: boolean) {
  const bubble = selected
    ? p.land
      ? "background:#fbbf24;color:#000;border:1px solid #fff;box-shadow:0 0 0 4px rgba(251,191,36,.4)"
      : "background:#10b981;color:#0d0f12;border:1px solid rgba(255,255,255,.2);box-shadow:0 0 0 4px rgba(16,185,129,.3)"
    : p.land
      ? "background:#1C1608;color:#fbbf24;border:1px solid rgba(245,158,11,.5)"
      : "background:#14181f;color:#f8fafc;border:1px solid #232c37";
  const tip = selected ? (p.land ? "#fbbf24" : "#10b981") : p.land ? "#1C1608" : "#14181f";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-100%) ${selected ? "scale(1.1)" : ""};display:flex;flex-direction:column;align-items:center">
      <div style="${bubble};display:flex;align-items:center;gap:4px;white-space:nowrap;font:900 12px/1 var(--font-sans);padding:6px 10px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.5)">${p.land ? "🏞️ " : ""}${esc(p.label)}${p.star && !p.land ? " ✦" : ""}</div>
      <div style="width:10px;height:10px;transform:rotate(45deg);margin-top:-5px;background:${tip}"></div></div>`,
  });
}

function Fit({ points, focus }: { points: PinPoint[]; focus: string | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    const f = focus ? points.find((p) => p.id === focus) : null;
    if (f) map.setView([f.lat, f.lng], 15);
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 15 });
  }, [map, points, focus]);
  return null;
}

/** Full-screen listing map with selectable price pins. */
export default function PinMap({ points, selected, onSelect, focus = null }: { points: PinPoint[]; selected: string | null; onSelect: (id: string | null) => void; focus?: string | null }) {
  const icons = useMemo(() => new Map(points.map((p) => [p.id, { on: pinIcon(p, true), off: pinIcon(p, false) }])), [points]);
  return (
    <MapContainer center={[13.7946, 100.3237]} zoom={11} scrollWheelZoom zoomControl={false} className="dwelly-map h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Fit points={points} focus={focus} />
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={selected === p.id ? icons.get(p.id)!.on : icons.get(p.id)!.off}
          zIndexOffset={selected === p.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(selected === p.id ? null : p.id) }}
        />
      ))}
    </MapContainer>
  );
}
