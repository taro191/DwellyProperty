import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/bottom-nav";

/**
 * The prototype's phone-width app shell (design: `wm` root div): every screen lives in a centred
 * max-w-md column with the top bar and, on the main screens, the bottom tab bar.
 * overflow-x-clip (not hidden) so the sticky top bar keeps sticking.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md mx-auto relative min-h-screen min-h-[100dvh] bg-[var(--bg)] shadow-2xl overflow-x-clip">
      <AppHeader />
      {children}
      <BottomNav />
    </div>
  );
}
