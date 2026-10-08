import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { loadPropertyDetail } from "../detail";
import { AppointmentScreen } from "./appointment-screen";

export const metadata: Metadata = { title: "นัดหมายดูทรัพย์" };

/** The next 7 days in Bangkok time, labelled like the prototype ("พ. 9 ต.ค."). */
function nextDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + (i + 1) * 86_400_000);
    return {
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d),
      label: d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" }),
    };
  });
}

export default async function AppointmentPage({ params, searchParams }: PageProps<"/property/[code]/appointment">) {
  const { code } = await params;
  const sp = await searchParams;
  if (!(await getViewer())) redirect(`/login?next=/property/${code}/appointment`);
  const d = await loadPropertyDetail(code);
  if (!d) notFound();
  if (d.isMine || !d.accepting) redirect(`/property/${d.view.code}`);
  const format = sp.format === "video" || sp.format === "phone" ? sp.format : d.view.land ? "onsite" : "video";
  return (
    <AppointmentScreen
      property={{ id: d.view.id, code: d.view.code, name: d.view.name, price: d.view.price, image: d.images[0], isLand: Boolean(d.view.land), seller: d.contact.name }}
      days={nextDays()}
      initialFormat={format}
    />
  );
}
