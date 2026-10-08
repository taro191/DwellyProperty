import { getViewer } from "@/lib/auth";
import { favoriteIds, searchListings } from "@/server/services/listings";
import { toListingView } from "@/lib/listing-view";
import { listZones } from "@/server/services/content";
import type { SearchFilters } from "@/lib/queries";

/** Listings + the viewer's saved ids for the prototype screens, which filter on the client like the design does. */
export async function loadScreenListings(filters: Partial<SearchFilters> = {}) {
  const viewer = await getViewer();
  const [{ items }, favorites] = await Promise.all([searchListings({ sort: "newest", ...filters }, { limit: 300 }), favoriteIds(viewer?.id)]);
  return { properties: items.map(toListingView), savedIds: [...favorites], signedIn: Boolean(viewer), viewer };
}

/** Zones + listings for the Dwelly Zone screens. */
export async function loadZonesScreen() {
  const [zones, { properties, savedIds, signedIn }] = await Promise.all([listZones(), loadScreenListings()]);
  return { zones: zones.map((z) => ({ id: z.id, slug: z.slug, name: z.name_th, description: z.description })), properties, savedIds, signedIn };
}
