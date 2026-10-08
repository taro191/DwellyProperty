import { getViewer } from "@/lib/auth";
import { unreadNotificationCount } from "@/server/services/notifications";
import { signOut } from "@/app/(site)/login/actions";
import { AppHeaderBar } from "@/components/app/app-header-bar";

/** Top bar (design: `fu`); title and back button follow the current route. */
export async function AppHeader() {
  const viewer = await getViewer();
  const unread = viewer ? await unreadNotificationCount(viewer) : 0;
  return (
    <AppHeaderBar
      unreadCount={unread}
      signOutAction={signOut}
      user={viewer ? { name: viewer.profile.display_name, avatar: viewer.profile.avatar_url, isStaff: Boolean(viewer.staffRole) } : null}
    />
  );
}
