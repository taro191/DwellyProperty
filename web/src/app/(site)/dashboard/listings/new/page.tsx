import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { getZones } from "@/lib/queries";
import { Alert, PageHeader } from "@/components/ui";
import { ListingForm } from "../listing-form";
import { createListing } from "../actions";

export const metadata: Metadata = { title: "ลงประกาศใหม่" };

export default async function NewListingPage() {
  await requireViewer("/dashboard/listings/new");
  const zones = await getZones();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="ลงประกาศใหม่" subtitle="ขั้นที่ 1 จาก 2 — กรอกข้อมูลทรัพย์ แล้วเพิ่มรูปในขั้นถัดไป" />
      <div className="mb-5">
        <Alert tone="info">ประกาศจะถูกบันทึกเป็นแบบร่าง คุณสามารถเพิ่มรูปและตรวจทานก่อนส่งให้ทีมงานตรวจสอบได้</Alert>
      </div>
      <ListingForm action={createListing} zones={zones} submitLabel="บันทึกและไปขั้นเพิ่มรูป →" />
    </div>
  );
}
