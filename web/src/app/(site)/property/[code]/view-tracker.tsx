"use client";

import { useEffect } from "react";
import { trackView } from "../actions";

/** Counts a view once per mount (server dedupes per user per hour). */
export function ViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    void trackView(propertyId);
  }, [propertyId]);
  return null;
}
