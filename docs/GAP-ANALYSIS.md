# DwellyProperty — Gap Analysis (สิ่งที่ design ยังขาด)

> วิเคราะห์จาก `design/public/dwelly.min.html` เมื่อ 2026-10-07 · อ่านคู่กับ `docs/SPEC.md`
> ลำดับความสำคัญ: **P0** = ต้องมีก่อนเปิดใช้จริง · **P1** = ควรมีในช่วงแรก · **P2** = ทำทีหลังได้

## 1. ระบบ Admin หลังบ้าน: ยังไม่มี

ใน prototype มีเพียงร่องรอยของ admin ดังนี้

| สิ่งที่พบ | สถานะจริง |
|---|---|
| role `admin` ใน `users.role` | มีแค่ใน schema ไม่มีผู้ใช้ admin และไม่มีหน้าจอสำหรับ admin |
| "Database Studio" (ชื่ออยู่ใน `<title>`) | ไม่มี UI ให้เข้าไปใช้ |
| `executeQuery` (SQL console จำลอง), `exportFullBackup`, `importFullBackup` | มีเป็นเมธอดใน data layer แต่ไม่มีหน้าจอเรียกใช้ |
| `resetDatabase` | ใช้แค่ในหน้า error ("รีเซ็ตฐานข้อมูล") |
| ตาราง `audit_logs` + `logAudit()` | มีการบันทึก log แต่ไม่มีหน้าดู |
| สิทธิ์ Dwelly Commission | **ผู้ใช้ได้สิทธิ์เองเพียงพิมพ์รหัสที่ขึ้นต้นด้วย `DP-` หรือ `OWN-`** ไม่ผ่านการอนุมัติ เป็นช่องโหว่ถ้าทำแบบนี้ในระบบจริง |

นอกจากนี้ prototype ยัง **"ตรวจสอบแล้ว (Verified)"** ทรัพย์, KYC, ใบอนุญาตนายหน้า TREBA และ trust score ของ Pod ได้แค่การตั้งค่า boolean ใน seed data **ยังไม่มีขั้นตอนตรวจสอบจริงและไม่มีผู้อนุมัติ** ทั้งที่การยืนยันตัวตนเป็นจุดขายหลักของแพลตฟอร์ม

### โมดูล Admin ที่ต้องออกแบบเพิ่ม

| # | โมดูล | รายละเอียด | Priority |
|---|---|---|---|
| A1 | Admin auth + RBAC | บัญชีพนักงานแยกจากผู้ใช้ทั่วไป, role: super-admin / moderator / verifier / support / finance, 2FA | P0 |
| A2 | Listing moderation | คิวประกาศใหม่ → อนุมัติ/ปฏิเสธพร้อมเหตุผล, แก้ไข/ซ่อน/ลบ, ตรวจประกาศซ้ำหรือหลอกลวง | P0 |
| A3 | Verification center | ตรวจโฉนด/หนังสือกรรมสิทธิ์, KYC (บัตรประชาชน + selfie), ใบอนุญาตนายหน้า, เอกสารบริษัท → ให้หรือถอน badge "Verified" | P0 |
| A4 | User management | ค้นหา/ดูผู้ใช้, เปลี่ยน role, ระงับ/แบนบัญชี, ประวัติกิจกรรม, รีเซ็ตการล็อกอิน | P0 |
| A5 | Reports & disputes | ผู้ใช้แจ้งประกาศหรือผู้ใช้ปลอม → คิวตรวจสอบ → ดำเนินการ | P0 |
| A6 | Commission & Co-Agent approvals | ระบบขอสิทธิ์และอนุมัติที่มาแทนการพิมพ์รหัส, จัดการสัญญา Co-Agent, ติดตามดีลและยอดค่าคอมที่ต้องจ่าย | P1 |
| A7 | Agency Pods management | อนุมัติการตั้ง Pod, สมาชิก, คำนวณ trust score, ประกัน/escrow | P1 |
| A8 | Billing & subscriptions | แผนสมาชิก, การซื้อ Boost/Spotlight, ใบแจ้งหนี้/ใบกำกับภาษี, คืนเงิน, คูปอง | P1 |
| A9 | Content / CMS | Dwelly Hubs (แคมเปญ), Zones, Activities/ทัวร์สด, แบนเนอร์หน้าแรก, บทความ "Market Trends" | P1 |
| A10 | Notifications & broadcast | ส่งประกาศถึงผู้ใช้ผ่านในแอป / LINE OA / email, จัดการ template | P1 |
| A11 | Dashboard & analytics | ผู้ใช้ใหม่, ประกาศ, leads, นัดหมาย, ข้อเสนอ, conversion, รายได้, ยอดตามโซน | P1 |
| A12 | Audit log viewer | ดูว่าใครแก้อะไร เมื่อไร (ทั้ง admin และผู้ใช้) | P1 |
| A13 | System settings | ค่าธรรมเนียม, อัตราคอมพื้นฐาน, หมวดและแท็กทรัพย์, รายชื่อโซนและทำเล, ข้อความนโยบาย | P2 |
| A14 | Data tools | export CSV, backup/restore (แทน Database Studio) | P2 |

## 2. ช่องโหว่ใน Data Model (ต้องแก้ก่อนทำ DB จริง)

| # | ปัญหา | ผลกระทบ | แก้โดย | P |
|---|---|---|---|---|
| D1 | `properties` ไม่มี `ownerId` / `agentId` (มีแค่ `sellerName` ที่เป็นข้อความ) | ระบุไม่ได้ว่าใครเป็นเจ้าของประกาศ จึงทำสิทธิ์แก้ไข/ลบไม่ได้ | เพิ่ม FK → `users` | P0 |
| D2 | `properties` ไม่มี `status` | ไม่มี lifecycle: draft → pending review → active → reserved → sold/rented → expired | เพิ่ม enum status + `publishedAt` / `expiresAt` | P0 |
| D3 | ไม่มีพิกัด lat/lng | **Dwelly Map ใน prototype จึงเป็นแผนที่จำลอง** ค้นหาจากแผนที่หรือรัศมีไม่ได้ | เพิ่ม lat/lng (PostGIS), ที่อยู่แบบโครงสร้าง (จังหวัด/อำเภอ/ตำบล), เชื่อม map provider | P0 |
| D4 | รูปมีได้แค่ 1 รูป (`image`) และไม่มีระบบอัปโหลด | ประกาศจริงต้องมีหลายรูป วิดีโอ และแปลนห้อง | ตาราง `property_media` + storage + ย่อ/บีบอัดรูป | P0 |
| D5 | `leads`, `offers`, `appointments`, `conversations` ใช้ชื่อ (ข้อความ) แทน user id | ระบุผู้ซื้อ/ผู้ขายไม่ได้ ส่งแจ้งเตือนไม่ได้ | เปลี่ยนเป็น `buyerId` / `sellerId` (FK) | P0 |
| D6 | `notifications` ไม่มี `userId` | ทุกคนเห็นการแจ้งเตือนชุดเดียวกัน | เพิ่ม `userId` + link ไปยัง entity | P0 |
| D7 | `conversations.messages[]` เป็น array อยู่ในแถว | ขยายไม่ได้ ทำ realtime ไม่ได้ ไม่มีสถานะอ่านแล้วรายข้อความ | ตาราง `messages` + participants | P0 |
| D8 | `users` มีได้ role เดียว | ผู้ใช้คนเดียวกันเป็นได้ทั้งผู้ซื้อและเจ้าของ (prototype จึงต้องสลับ role) | ตาราง `user_roles` หรือแยก profile ตามบทบาท | P0 |
| D9 | `agency_profiles` ไม่ผูกกับ `users`, `agency_pods.members[]` เป็น array | ไม่รู้ว่านายหน้าคนไหนเป็นบัญชีไหน | FK `userId`, ตาราง `pod_members` | P1 |
| D10 | `saves` เป็นแค่ตัวเลขนับ | ผู้ใช้กดบันทึกแล้วไม่มีรายการ "ทรัพย์ที่บันทึก" | ตาราง `favorites` + `saved_searches` | P1 |
| D11 | ไม่มีตารางการเงิน | แผนสมาชิกและ Boost มีราคาอยู่ใน UI แต่ไม่มีที่บันทึกการซื้อ | `plans`, `subscriptions`, `orders`, `payments`, `invoices`, `boosts` | P1 |
| D12 | ไม่มีตารางเอกสารและการยืนยัน | ไม่มีที่เก็บโฉนด/KYC หรือผลการตรวจ | `verification_requests`, `documents` (storage แบบ private) | P0 |
| D13 | ไม่มี reports/flags, reviews ของผู้ขาย/ทรัพย์ (มีแค่ review นายหน้าเป็น array) | ดูแลคุณภาพแพลตฟอร์มไม่ได้ | `reports`, `reviews` | P1 |
| D14 | ไม่มีบันทึก consent / PDPA | ผิดกฎหมาย PDPA | `consents`, ระบบขอลบข้อมูล/export ข้อมูลของผู้ใช้ | P0 |
| D15 | ข้อมูลทรัพย์เช่ายังไม่ครบ | ไม่มีเงินประกัน ระยะสัญญาขั้นต่ำ เลี้ยงสัตว์ได้ไหม ค่าน้ำไฟ | เพิ่มฟิลด์ rental terms | P1 |

## 3. ฟีเจอร์ผู้ใช้ที่ยังขาด / เป็นแค่ mock

| # | เรื่อง | สถานะใน prototype | สิ่งที่ต้องทำ | P |
|---|---|---|---|---|
| F1 | Auth จริง | เป็นผู้ใช้ demo ที่เก็บใน localStorage ไม่มีการสร้างบัญชีจริง | LINE Login, Google, email OTP, ยืนยันเบอร์โทร | P0 |
| F2 | ลงประกาศ | สร้างประกาศได้ แต่**แก้ไขหรือลบไม่ได้** และไม่มีอัปโหลดรูป | ฟอร์มหลายขั้นตอน, บันทึก draft, อัปโหลดรูป, ส่งให้ตรวจ, ต่ออายุ, ปิดการขาย | P0 |
| F3 | แชท | ข้อมูล seed เท่านั้น (ไม่มีการสร้างบทสนทนาใหม่) | แชท realtime, ส่งรูป, แจ้งเตือนข้อความใหม่ | P0 |
| F4 | แจ้งเตือนภายนอก | ไม่มี | LINE OA Messaging API, email, Web Push | P1 |
| F5 | การชำระเงิน | ไม่มี (มีแค่ข้อความอธิบายสัดส่วนเงินดาวน์ 2% / 8% / 90%) | Payment gateway ไทย (Omise / 2C2P / PromptPay QR), ใบเสร็จและใบกำกับภาษี | P1 |
| F6 | เงินมัดจำ/escrow | มีแค่ badge "escrowReady" | **ระวังเรื่องกฎหมาย** ถ้าแพลตฟอร์มถือเงินแทนผู้ใช้ ควรเริ่มจากให้จ่ายตรงระหว่างคู่สัญญา หรือใช้ escrow ของพาร์ทเนอร์ | P2 |
| F7 | เอกสารและสัญญา | มีข้อความสัญญาเช่า/สัญญาจะซื้อจะขายเป็นตัวอย่าง | สร้าง PDF สัญญา, e-signature | P2 |
| F8 | แจ้งประกาศปลอม / รีวิว | ไม่มี | ปุ่ม report, ให้รีวิวหลังนัดชมหรือปิดดีล | P1 |
| F9 | ประกาศหมดอายุ / ต่ออายุ | มี `listingDays` แต่ไม่มีขั้นตอนต่ออายุ | งาน cron หมดอายุ + แจ้งเตือนก่อนหมด | P1 |
| F10 | SEO / แชร์ | เป็น SPA หน้าเดียว ไม่มี URL แยกต่อประกาศ | URL ต่อประกาศ (`/property/[slug]`), OG image, sitemap แชร์เข้า LINE ได้ | P0 |
| F11 | ค้นหาภาษาไทย | กรองข้อมูลฝั่ง client | Full-text ภาษาไทย (ตัดคำ) หรือ search service | P1 |
| F12 | สองภาษา | ข้อความไทยและอังกฤษปนกันใน UI | ระบบ i18n th/en | P2 |
| F13 | Analytics ฝั่งผู้ขาย | views / saves / interests เป็นตัวเลขตายตัว | เก็บ event จริง, กราฟให้ผู้ขาย | P1 |

## 4. Non-functional / ความปลอดภัย / กฎหมาย

- **Security (P0):** ตรวจสิทธิ์ฝั่ง server ทุกครั้ง (RLS), ห้ามให้สิทธิ์ผ่านรหัสที่ client ตรวจเอง, rate limit, ป้องกัน spam ลงประกาศ, เอกสาร KYC/โฉนดต้องเก็บใน storage แบบ private
- **PDPA (P0):** นโยบายความเป็นส่วนตัว, เก็บ consent, ปิดบังเบอร์โทรผู้ขายจนกว่าจะล็อกอินหรือติดต่อผ่านระบบ, ผู้ใช้ขอลบบัญชีได้
- **กฎหมายอสังหาฯ/นายหน้า (ควรปรึกษาผู้เชี่ยวชาญ):** ความรับผิดเรื่องข้อมูลประกาศ, การรับค่าคอมมิชชั่นหรือส่วนแบ่ง, การถือเงินมัดจำ, ภาษีจากรายได้แพลตฟอร์ม
- **Ops (P1):** backup อัตโนมัติ, monitoring/error tracking, CDN รูป, staging กับ production แยกกัน

## 5. สรุปข้อเสนอสำหรับ MVP

**ฝั่งผู้ใช้:** Auth (LINE/Google), ลงประกาศพร้อมรูป + แก้ไข/ปิดประกาศ, ค้นหา + แผนที่จริง, หน้ารายละเอียดทรัพย์ที่มี URL แยก, นัดชม, ยื่นข้อเสนอ, แชท, Seller dashboard, favorites, PDPA

**ฝั่ง Admin:** A1 Auth/RBAC, A2 Listing moderation, A3 Verification center, A4 User management, A5 Reports

**เฟสถัดไป:** Billing + แผนสมาชิก + Boost → Commission/Co-Agent + Pods → Hubs/Zones CMS → Investor tools → e-contract/escrow

**ต้องเพิ่มใน design (ให้ทีม UX/Figma):** ทุกหน้าของ Admin console, ฟอร์มลงประกาศ/แก้ไขแบบเต็ม (อัปโหลดรูป, ปักหมุดแผนที่), ขั้นตอนส่งเอกสาร KYC/โฉนด, หน้า Checkout/ชำระเงิน/ใบเสร็จ, ปุ่ม report, หน้าจัดการบัญชี/ลบบัญชี/consent, empty states และ error states
