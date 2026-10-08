import type { Metadata } from "next";
import { loadZonesScreen } from "../data";
import { ZonesScreen } from "./zones-screen";

export const metadata: Metadata = { title: "Dwelly Zone" };

export default async function ZonesPage() {
  return <ZonesScreen {...await loadZonesScreen()} selected={null} />;
}
