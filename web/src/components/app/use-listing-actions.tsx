"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/(site)/property/actions";
import { ShareSheet } from "@/components/app/share-sheet";
import type { ListingView } from "@/lib/listing-view";

/** Save (favourite) + share state shared by every card on a screen (prototype: savedIds / onToggleSave / onShare). */
export function useListingActions(initialSaved: string[], signedIn: boolean) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => new Set(initialSaved));
  const [sharing, setSharing] = useState<ListingView | null>(null);
  const [, startTransition] = useTransition();

  const toggleSave = (id: string) => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    const next = !saved.has(id);
    setSaved((s) => {
      const n = new Set(s);
      if (next) n.add(id);
      else n.delete(id);
      return n;
    });
    startTransition(async () => {
      await toggleFavorite(id, next);
    });
  };

  return {
    isSaved: (id: string) => saved.has(id),
    savedCount: saved.size,
    toggleSave,
    share: (p: ListingView) => setSharing(p),
    shareSheet: sharing ? <ShareSheet property={sharing} onClose={() => setSharing(null)} /> : null,
  };
}
