import { redirect } from "next/navigation";

/** Now a tab of the Seller & Landlord Center. */
export default function Page() {
  redirect("/dashboard?tab=4");
}
