import type { Metadata } from "next";
import { loadScreenListings } from "../data";
import { RentScreen } from "./rent-screen";

export const metadata: Metadata = { title: "เช่าอสังหาริมทรัพย์" };

export default async function RentPage() {
  const { properties, savedIds, signedIn } = await loadScreenListings({ type: "rent" });
  return <RentScreen properties={properties} savedIds={savedIds} signedIn={signedIn} />;
}
