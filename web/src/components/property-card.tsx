import { ListingGrid } from "@/components/app/listing-grid";
import { toListingView } from "@/lib/listing-view";
import type { PropertyWithMedia } from "@/lib/types";

/** Server wrapper: adapts DB rows to the prototype card model. */
export function PropertyGrid({
  items, favorites, signedIn = false,
}: { items: PropertyWithMedia[]; favorites?: Set<string>; signedIn?: boolean }) {
  return <ListingGrid items={items.map(toListingView)} saved={[...(favorites ?? [])]} signedIn={signedIn} />;
}
