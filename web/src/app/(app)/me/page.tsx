import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getContact, profileStats, signInProvider } from "@/server/services/account";
import { signOut } from "@/app/(site)/login/actions";
import { ProfileScreen } from "./profile-screen";

export const metadata: Metadata = { title: "โปรไฟล์ผู้ใช้งาน" };

export default async function MePage() {
  const viewer = await getViewer();
  if (!viewer) return <ProfileScreen user={null} stats={{ saved: 0, appointments: 0, offers: 0, views: 0 }} signOutAction={signOut} />;
  const [contact, stats, provider] = await Promise.all([getContact(viewer.id), profileStats(viewer), signInProvider(viewer.id)]);
  return (
    <ProfileScreen
      user={{
        name: viewer.profile.display_name,
        email: viewer.email ?? null,
        phone: contact.phone,
        lineId: contact.line_id,
        bio: viewer.profile.bio,
        avatar: viewer.profile.avatar_url,
        provider,
        kyc: viewer.profile.is_kyc_verified,
        role: viewer.profile.primary_role,
        isStaff: Boolean(viewer.staffRole),
      }}
      stats={stats}
      signOutAction={signOut}
    />
  );
}
