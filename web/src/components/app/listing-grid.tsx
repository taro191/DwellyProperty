"use client";

import { ListingGridCard } from "@/components/app/listing-cards";
import { useListingActions } from "@/components/app/use-listing-actions";
import type { ListingView } from "@/lib/listing-view";

/** Two-column grid of prototype cards (`bx`) with save + share, for pages that list server-loaded results. */
export function ListingGrid({ items, saved, signedIn }: { items: ListingView[]; saved: string[]; signedIn: boolean }) {
  const a = useListingActions(saved, signedIn);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <ListingGridCard property={p} isSaved={a.isSaved(p.id)} onToggleSave={a.toggleSave} onShare={a.share} key={p.id} />
        ))}
      </div>
      {a.shareSheet}
    </>
  );
}
