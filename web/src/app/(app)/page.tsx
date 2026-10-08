import { getViewer } from "@/lib/auth";
import { favoriteIds, searchListings } from "@/server/services/listings";
import { toListingView } from "@/lib/listing-view";
import { HomeScreen } from "./home-screen";

export default async function HomePage() {
  const viewer = await getViewer();
  const [{ items }, favorites] = await Promise.all([searchListings({ sort: "newest" }, { limit: 300 }), favoriteIds(viewer?.id)]);
  return <HomeScreen properties={items.map(toListingView)} savedIds={[...favorites]} signedIn={Boolean(viewer)} />;
}
