import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { PROVINCES } from "@/lib/constants";
import { AddPropertyScreen } from "./add-property-screen";

export const metadata: Metadata = { title: "ลงประกาศใหม่" };

export default async function NewListingPage() {
  await requireViewer("/dashboard/listings/new");
  return <AddPropertyScreen provinces={[...PROVINCES]} />;
}
