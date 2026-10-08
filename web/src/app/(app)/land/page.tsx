import type { Metadata } from "next";
import { loadScreenListings } from "../data";
import { LandScreen } from "./land-screen";

export const metadata: Metadata = { title: "ที่ดิน" };

export default async function LandPage() {
  const { properties, savedIds, signedIn } = await loadScreenListings({ category: "land" });
  return <LandScreen properties={properties} savedIds={savedIds} signedIn={signedIn} />;
}
