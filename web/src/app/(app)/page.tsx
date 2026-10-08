import { loadScreenListings } from "./data";
import { HomeScreen } from "./home-screen";

export default async function HomePage() {
  const { properties, savedIds, signedIn } = await loadScreenListings();
  return <HomeScreen properties={properties} savedIds={savedIds} signedIn={signedIn} />;
}
