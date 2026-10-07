"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/(site)/property/actions";
import { cn } from "@/components/ui";

export function FavoriteButton({ propertyId, initial, signedIn }: { propertyId: string; initial: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useOptimistic(initial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={saved ? "เลิกบันทึก" : "บันทึกทรัพย์"}
      aria-pressed={saved}
      onClick={() => {
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        startTransition(async () => {
          setSaved(!saved);
          await toggleFavorite(propertyId, !saved);
        });
      }}
      className="grid h-9 w-9 place-items-center rounded-full bg-black/55 backdrop-blur transition-colors hover:bg-black/75"
    >
      <Heart className={cn("h-4.5 w-4.5", saved ? "fill-rose-500 text-rose-500" : "text-white")} />
    </button>
  );
}
