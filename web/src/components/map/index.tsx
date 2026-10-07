"use client";

import dynamic from "next/dynamic";

const loading = () => <div className="h-full w-full animate-pulse rounded-3xl bg-surface-2" />;

// Leaflet touches `window`, so maps only render on the client.
export const ListingsMap = dynamic(() => import("./listings-map"), { ssr: false, loading });
export const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading });
export const SingleLocationMap = dynamic(() => import("./single-location"), { ssr: false, loading });
export type { MapPoint } from "./listings-map";
