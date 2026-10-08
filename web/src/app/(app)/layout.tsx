// Every page reads the database or the session at request time.
export const dynamic = "force-dynamic";

import { AppFrame } from "@/components/app/app-frame";

/** Screens rebuilt from the prototype: they handle their own spacing. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppFrame>{children}</AppFrame>;
}
