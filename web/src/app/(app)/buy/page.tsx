import type { Metadata } from "next";
import { loadScreenListings } from "../data";
import { ExploreScreen } from "./explore-screen";

export const metadata: Metadata = { title: "ซื้ออสังหาริมทรัพย์" };

export default async function BuyPage({ searchParams }: PageProps<"/buy">) {
  const sp = await searchParams;
  const { properties, savedIds, signedIn } = await loadScreenListings({ type: "sale" });
  const category = ["land", "condo", "house"].includes(String(sp.category)) ? String(sp.category) : "all";
  return <ExploreScreen properties={properties} savedIds={savedIds} signedIn={signedIn} initialCategory={category} initialQuery={typeof sp.q === "string" ? sp.q : ""} />;
}
