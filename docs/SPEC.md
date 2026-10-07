# DwellyProperty — Product Spec (จาก design prototype)

> ที่มา: `design/public/dwelly.min.html` (Figma Make export, React bundle แบบ minified ไม่มี source)
> สกัดเมื่อ 2026-10-07 · schema ฉบับเต็ม (คอลัมน์ ชนิด คำอธิบาย ตัวอย่าง) อยู่ที่ `docs/design-schema.json`

## 1. ภาพรวม

**Dwelly Property & Database Studio** เป็นแพลตฟอร์มอสังหาริมทรัพย์ภาษาไทย (เริ่มที่โซนศาลายา/มหิดล) สำหรับซื้อ ขาย เช่า และลงทุน
มีจุดเด่นคือทรัพย์ที่ "Verified" (ตรวจโฉนด/กรรมสิทธิ์แล้ว) เครือข่ายนายหน้า "Agency Pods" ที่การันตีความน่าเชื่อถือ
และระบบ "Dwelly Commission" ที่ให้เจ้าของตั้งอัตราค่านายหน้าสำหรับ Co-Agent ได้

Prototype เก็บข้อมูลทั้งหมดใน `localStorage` (`dwelly_db_<table>`, `dwelly_db_version=2`) และมีหน้า "Database Studio" ไว้ดู/แก้ตาราง

## 2. บทบาทผู้ใช้ (roles)

| role | ชื่อในแอป | ใช้ทำอะไรหลักๆ |
|---|---|---|
| `buyer` | 1. ผู้ซื้อ | ค้นหา/แผนที่ เทียบทรัพย์ นัดชม ยื่นข้อเสนอ คำนวณสินเชื่อ/ค่าโอน |
| `tenant` | 2. ผู้เช่า | ค้นหาทรัพย์เช่า โพสต์หาทรัพย์ (reverse-match) |
| `seller` | เจ้าของ / ผู้ให้เช่า | Seller & Landlord Center: ลงประกาศ ดู leads ข้อเสนอ นัดหมาย ตั้งค่าคอมมิชชั่น |
| `investor` | 4. นักลงทุน | พอร์ต ทรัพย์ Yield สูง ดีลหลุดจำนอง ที่ดิน (ผังเมือง/โฉนด) |
| `agency` | 5. นายหน้า | Agency Pro Dashboard, Pods, Co-Agent, Owner–Agent collaboration |

ล็อกอินได้ด้วย `email`, `google`, `line` (LINE สำคัญมากสำหรับตลาดไทย)

## 3. หน้าจอ / ฟีเจอร์ (view ids ที่พบใน bundle)

- **ค้นหา:** `explore`, `discovery`, `search-map` (Dwelly Map), `rental-explore`, `land-explore`, `reverse-match`, ตัวกรองหมวด (condo / house / townhome / land), ช่วงราคา, เรียง (แนะนำ/ล่าสุด/ราคา↑↓), แท็ก (pet-friendly, ติดถนนใหญ่, งบประหยัด, Pod การันตี)
- **รายละเอียดทรัพย์:** `property-detail`, เปรียบเทียบทรัพย์, `deed-zoning` (ที่ดิน), `mortgage-transfer` (ค่าใช้จ่ายวันโอน/จดจำนอง)
- **ธุรกรรม:** `offer-flow` (ยื่นข้อเสนอ → มัดจำจอง 2% → ทำสัญญา 8% → วันโอน 90%), นัดหมาย (`viewing`: ชมจริง / วิดีโอคอล, เลือกวัน-ช่วงเวลา)
- **สื่อสาร:** `messages` (Dwelly Inbox), `notifications`
- **ผู้ขาย:** `seller-dashboard`, `boost` (ดันประกาศ / Spotlight), `dwelly-commission`, `owner-agent-collab`
- **นายหน้า:** Agency Pro Dashboard, Agency Pods (trust score, ประกัน, การยืนยัน 4 ทาง), Agent Profile (`expert`, `reviews`)
- **นักลงทุน:** `investor`, `portfolio`
- **Dwelly Hub / Zone:** `festival-home`, `festival-zones` (แคมเปญมีกำหนดเวลาและนับถอยหลัง, โซนตามธีม เช่น `mahidol`), กิจกรรม/ทัวร์สด/Q&A
- **บัญชี:** `login`, `register`, `onboarding`, `profile`, `membership` / `premium` / `pass` (Your Dwelly Pass), `policy`, `permissions`
- **แอดมิน:** Database Studio (ดู/แก้ตาราง, audit log, reset DB)

## 4. Data model (14 ตาราง)

`*` = required · FK = foreign key

| ตาราง | หน้าที่ | คอลัมน์หลัก |
|---|---|---|
| `properties` | ประกาศทรัพย์ | name*, location*, price*, size*, bedrooms*, propertyCategory, rentPrice, landDetails{}, floor, direction, furniture, maintenanceFee, availability, tags[], verified, featured, sellerType(owner\|agency), sellerName, sellerContact, podCode/podName, hasDwellyCommission, commissionBaseRate, listingDays, views/saves/interests, matchScore |
| `festivals` | Dwelly Hubs / แคมเปญ | name*, theme, location, type, status, startDate, endDate, propertyCount, sellerCount, countdown |
| `zones` | โซนตามธีม | icon, name*, desc, count |
| `activities` | ทัวร์สด / Q&A / workshop | time, title*, desc, host, type, seats, registered, day |
| `leads` | ผู้สนใจทรัพย์ (ฝั่งผู้ขาย) | propertyId→properties, buyer*, intent*, status*, phone, offerAmount |
| `appointments` | นัดชม/วิดีโอคอล | propertyId*→properties, buyerName*, sellerName*, format*, date*, timeSlot*, status, notes |
| `offers` | ข้อเสนอซื้อ/เช่า | propertyId*→properties, buyerName*, listedPrice*, offerPrice*, discountAmount/Percent, validDays, status, note |
| `conversations` | แชท | propertyId, propertyName*, seller*, sellerType, lastMessage, unread, messages[] (ฝังอยู่ในแถว) |
| `agency_pods` | ทีมนายหน้า | podCode*, name*, zone*, leaderName*, trustScore, verifiedStatus, membersCount, closedDeals, activeListings, insuranceCoverage, rating, verifications{}, members[] |
| `agency_profiles` | โปรไฟล์นายหน้า | agentCode*, name*, agencyCompany, phone, lineId, email, experienceYears, specializedZones[], specializedPropertyTypes[], verification{}, stats{}, pastDeals[], certificates[], reviews[] |
| `notifications` | แจ้งเตือน | type*, title*, sub, read, icon |
| `commission_settings` | กฎคอมมิชชั่นรายทรัพย์ | propertyId*→properties, enabled*, type, sale/rent rate เดือน 1 / 2 / 3+, renewalRate, listingDays, startDate |
| `users` | บัญชีผู้ใช้ | name*, email*, provider*(email\|google\|line), role*, phone, lineId, isVerified |
| `audit_logs` | ประวัติการแก้ไข | action*, tableName*, recordId, description*, timestamp*, performedBy |

สถานะที่พบ: `pending`, `confirmed`, `accepted`, `rejected`, `active`, `new`, `contacted`, `verified`

**ข้อสังเกตตอนย้ายไปใช้ DB จริง**
- `appointments`, `offers`, `conversations` เก็บชื่อ (buyerName, sellerName, propertyName) เป็นข้อความแทนการอ้าง `users.id` จึงควรเปลี่ยนเป็น FK
- `conversations.messages[]` ควรแยกเป็นตาราง `messages`
- `agency_pods.members[]` และ `agency_profiles.reviews[]` / `pastDeals[]` ควรแยกเป็นตาราง
- ยังไม่มีตาราง saved/favorites, รูปภาพหลายรูปต่อทรัพย์, subscriptions/payments (แผนสมาชิกมีแต่ใน UI)

## 5. แผนสมาชิก (Monetization)

| กลุ่ม | แผน | ราคา (฿) |
|---|---|---|
| เจ้าของ | Owner Starter / Owner Pro Verified / Owner VIP Speed Close | 0 / 399 ต่อเดือน / 1,290 ต่อเดือน |
| นายหน้า | Agent Starter / Agency Pro Team / Agency Enterprise Master | 490 / 1,990 / 4,900 ต่อเดือน |
| นักลงทุน | Investor Free / Investor Club Pro / Institutional & Land Elite | 0 / 590 / 2,490 ต่อเดือน |
| Boost | Dwelly Spotlight Banner (14 วัน) และ boost อื่นๆ | 999 ต่อครั้ง |

## 6. Design tokens

ธีมมืด: `--surface-2 #1b2129`, `--border #232c37`, accent `#10b981` (emerald), theme-color `#0d0f12` · ฟอนต์ Inter + Noto Sans Thai + JetBrains Mono · Tailwind CSS · mobile-first (PWA meta)

## 7. ขั้นต่อไป (ยังต้องตัดสินใจ)

1. **เลือก stack** ตัวเลือกที่แนะนำคือ Next.js + Supabase (Postgres + Auth + Storage + Realtime สำหรับแชท) ซึ่งเข้ากับ React/Tailwind ใน design อยู่แล้ว
2. **กำหนด MVP scope** ข้อเสนอ: auth (LINE/Google/email) → ลงประกาศ + ค้นหา/กรอง/แผนที่ → รายละเอียดทรัพย์ → นัดชม → ยื่นข้อเสนอ → Seller dashboard (leads/offers/appointments) → แชท ส่วน Pods, Commission, Hubs, Investor และ Billing ไว้เฟสถัดไป
3. ออกแบบ DB schema จริงจากข้อ 4 (normalize + RLS)
4. Port UI ทีละหน้า โดยใช้ prototype เป็นต้นแบบภาพ
