import type { Metadata } from "next";
import { loadScreenListings } from "../data";
import { MapScreen } from "./map-screen";

export const metadata: Metadata = { title: "Dwelly Map" };

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const sp = await searchParams;
  const { properties } = await loadScreenListings();
  return <MapScreen properties={properties} focus={typeof sp.focus === "string" ? sp.focus : null} />;
}
