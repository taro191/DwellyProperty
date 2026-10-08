// Every page reads the database or the session at request time.
export const dynamic = "force-dynamic";

import { AppFrame } from "@/components/app/app-frame";

/** Pages not yet rebuilt from the prototype: same app shell, padded content. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <AppFrame>
      <main className="phone-layout px-4 pb-10 pt-4">{children}</main>
    </AppFrame>
  );
}
