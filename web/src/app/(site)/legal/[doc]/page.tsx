import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { CONSENT_VERSION } from "@/lib/constants";

// Placeholder legal copy — must be replaced with text reviewed by a Thai lawyer before launch.
const DOCS = {
  terms: {
    title: "ข้อกำหนดการใช้งาน",
    sections: [
      ["การใช้บริการ", "Dwelly เป็นแพลตฟอร์มกลางสำหรับประกาศและติดต่อซื้อ ขาย เช่า อสังหาริมทรัพย์ Dwelly ไม่ใช่คู่สัญญาในการซื้อขายหรือเช่า"],
      ["ความถูกต้องของประกาศ", "ผู้ลงประกาศรับรองว่าเป็นเจ้าของหรือได้รับมอบอำนาจ และข้อมูลถูกต้อง ทีมงานมีสิทธิ์ระงับประกาศที่ไม่เหมาะสมหรือเข้าข่ายหลอกลวง"],
      ["การชำระเงิน", "ห้ามโอนเงินมัดจำก่อนตรวจสอบทรัพย์และเอกสารสิทธิ์ ข้อเสนอราคาในระบบไม่มีผลผูกพันจนกว่าจะทำสัญญา"],
      ["การระงับบัญชี", "บัญชีที่ละเมิดข้อกำหนดอาจถูกระงับหรือปิดถาวร"],
    ],
  },
  privacy: {
    title: "นโยบายความเป็นส่วนตัว",
    sections: [
      ["ข้อมูลที่เก็บ", "ชื่อ อีเมล เบอร์โทร LINE ID ข้อมูลประกาศ ข้อความแชท และเอกสารยืนยันตัวตนที่คุณส่ง"],
      ["วัตถุประสงค์", "ให้บริการแพลตฟอร์ม ยืนยันตัวตนและกรรมสิทธิ์ ป้องกันการฉ้อโกง และ (เมื่อได้รับความยินยอม) ส่งข่าวสาร"],
      ["การเปิดเผย", "เบอร์โทรของคุณจะแสดงต่อผู้ใช้ที่ล็อกอินและกดดูเบอร์ในประกาศของคุณเท่านั้น เอกสารยืนยันเข้าถึงได้เฉพาะทีมตรวจสอบ"],
      ["สิทธิของคุณ", "ขอดู ขอสำเนา แก้ไข ถอนความยินยอม และขอลบข้อมูลได้ที่หน้า “ความเป็นส่วนตัว” ในบัญชีของคุณ"],
      ["ระยะเวลาเก็บ", "เก็บตลอดที่มีบัญชี และลบหรือทำให้ไม่สามารถระบุตัวตนได้ภายใน 30 วันหลังขอลบบัญชี เว้นแต่กฎหมายกำหนดให้เก็บ"],
    ],
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  return { title: DOCS[doc as keyof typeof DOCS]?.title ?? "เอกสาร" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  const d = DOCS[doc as keyof typeof DOCS];
  if (!d) notFound();
  return (
    <Card className="mx-auto max-w-3xl space-y-5 p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">{d.title}</h1>
      <p className="text-xs text-subtle">ฉบับวันที่ {CONSENT_VERSION}</p>
      <Alert tone="warning">ฉบับร่าง — ต้องให้ที่ปรึกษากฎหมายตรวจทานก่อนเปิดให้บริการจริง</Alert>
      {d.sections.map(([h, body]) => (
        <section key={h}>
          <h2 className="font-bold">{h}</h2>
          <p className="mt-1 text-sm leading-7 text-muted">{body}</p>
        </section>
      ))}
    </Card>
  );
}
