# Dwelly Property

แพลตฟอร์มอสังหาริมทรัพย์ (ซื้อ / ขาย / เช่า / ที่ดิน) ที่เน้นประกาศที่ตรวจสอบแล้ว พร้อมระบบหลังบ้านสำหรับทีมงาน

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `design/` | ต้นแบบจาก Figma Make (`public/dwelly.min.html`) ใช้เป็น reference เท่านั้น |
| `docs/` | `SPEC.md` (สเปกจาก design), `GAP-ANALYSIS.md`, `DB-SCHEMA.md`, `design-schema.json` |
| `supabase/` | migrations (Postgres + RLS + RPC), `seed.sql` (ข้อมูลตัวอย่าง), `config.toml` |
| `tools/db-check/` | ทดสอบ migrations และ RLS บน PGlite (ไม่ต้องใช้ Docker) |
| `web/` | แอป Next.js 16 (App Router, Tailwind v4, Supabase SSR) ทั้งหน้าเว็บผู้ใช้และ `/admin` |

## เริ่มต้นใช้งาน (development)

ต้องมี Node.js 20.9 ขึ้นไป (ทดสอบกับ v24)

### 1. สร้างฐานข้อมูล Supabase

**ทางเลือก A — Supabase Cloud (ไม่ต้องใช้ Docker)**
1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard (เลือก region Singapore)
2. เชื่อมโปรเจกต์และ push schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push            # รัน supabase/migrations ทั้งหมด
   ```
3. (ถ้าต้องการข้อมูลตัวอย่าง) เปิด SQL Editor แล้วรันไฟล์ `supabase/seed.sql`
   **ห้ามรัน seed บน production** เพราะจะสร้างบัญชีทดสอบที่ใช้รหัสผ่านเดียวกันทั้งหมด

**ทางเลือก B — Local (ต้องมี Docker Desktop)**
```bash
npx supabase start     # รัน migrations + seed ให้อัตโนมัติ
```

### 2. ตั้งค่า Auth (Supabase Dashboard → Authentication)
- **URL Configuration**: Site URL = `http://localhost:3000` และเพิ่ม Redirect URL `http://localhost:3000/**`
- **Email**: เปิด Email provider ไว้ ระบบรองรับทั้งรหัส OTP 6 หลักและ magic link
  ถ้าต้องการให้อีเมลแสดงรหัส ให้ใส่ `{{ .Token }}` ใน template "Magic Link"
- **Google** (ไม่บังคับ): เปิด provider แล้วใส่ Client ID/Secret จาก Google Cloud Console
- **pg_cron** (Database → Extensions): เปิดแล้วรัน
  `select cron.schedule('dwelly-maintenance', '7 * * * *', 'select public.run_maintenance()');`
  เพื่อให้ประกาศและข้อเสนอหมดอายุอัตโนมัติ

### 3. รันเว็บ
```bash
cd web
cp .env.example .env.local      # ใส่ URL และ publishable key จาก Project Settings → API Keys
npm install
npm run dev                     # http://localhost:3000
```
ถ้ายังไม่ได้ใส่ค่าใน `.env.local` ทุกหน้าจะแสดงหน้าคำแนะนำการตั้งค่า

### บัญชีทดสอบ (มีเมื่อรัน seed.sql)
รหัสผ่านทุกบัญชีคือ `Dwelly@1234` ให้เข้าสู่ระบบด้วยแท็บ "รหัสผ่าน"

| อีเมล | บทบาท |
|---|---|
| `admin@dwelly.local` | Super Admin (เข้า `/admin` ได้ทุกเมนู) |
| `moderator@dwelly.local` | Moderator (ตรวจประกาศ, รายงาน, Hubs) |
| `owner@dwelly.local`, `owner2@dwelly.local` | เจ้าของทรัพย์ (มีประกาศจาก design) |
| `agent@dwelly.local` | นายหน้า (หัวหน้า Pod, ใบอนุญาตยืนยันแล้ว) |
| `buyer@dwelly.local` | ผู้ซื้อ |

## คำสั่งที่ใช้บ่อย
```bash
cd tools/db-check && npm install && npm run check   # ทดสอบ migrations + RLS (55 เคส)
cd web && npx tsc --noEmit && npx eslint src         # type check + lint
cd web && npm run build                              # production build
```
เมื่อแก้ schema ให้สร้างไฟล์ใหม่ใน `supabase/migrations/` (ห้ามแก้ไฟล์ที่ push ไปแล้ว) เพิ่มเคสทดสอบใน `tools/db-check/check.mjs` และอัปเดต `web/src/lib/types.ts`

## สถานะ (2026-10-07)

**เสร็จแล้ว**
- ฐานข้อมูล 40 ตาราง พร้อม RLS ทุกตาราง, state machine ของประกาศ/ข้อเสนอ/นัดหมาย, audit log, PDPA (consent, export, ลบบัญชี)
- เว็บผู้ใช้:
  - ล็อกอิน Google / OTP อีเมล / รหัสผ่าน, onboarding พร้อม consent
  - ค้นหา + ตัวกรอง + แผนที่, หน้ารายละเอียดทรัพย์ (SEO, JSON-LD, sitemap)
  - บันทึกทรัพย์, สอบถาม, นัดชม, ยื่นข้อเสนอ/เสนอราคากลับ, แชท realtime, แจ้งเตือน, รายงานประกาศ
- ศูนย์ผู้ขาย:
  - ลงประกาศ/แก้ไข, อัปโหลดรูป (ย่อขนาดในเบราว์เซอร์), ปักหมุดแผนที่, ขั้นตอนสถานะประกาศ
  - จัดการ leads / นัดหมาย / ข้อเสนอ, Co-Agent commission, โปรไฟล์นายหน้า, Agency Pod
- ยืนยันตัวตน: ส่งเอกสาร KYC / ใบอนุญาตนายหน้า / โฉนด ไปเก็บใน private storage
- Admin (`/admin`): ตรวจประกาศ, ตรวจเอกสาร, รายงาน, ผู้ใช้ (ระงับ/แบน), Pods, Co-Agent partner, Hubs/Zones, คำขอลบบัญชี, audit log, จัดการทีมงาน (RBAC 5 บทบาท)

**ยังไม่ได้ทำ / ต้องตัดสินใจ**
- **LINE Login**: Supabase ไม่มี LINE เป็น provider ในตัว ต้องทำเป็น custom OIDC หรือ Edge Function
- **ระบบชำระเงิน**: schema และ `create_order` / `fulfill_order` พร้อมแล้ว แต่ยังไม่ได้เลือกผู้ให้บริการ (Omise / 2C2P / PromptPay) และยังไม่มีหน้า checkout หรือ webhook
- **แจ้งเตือนนอกแอป** (LINE OA / email / push): ต่อจากตาราง `notifications` ด้วย Database Webhook + Edge Function
- **ค้นหา**: ยังไม่มีการตัดคำภาษาไทย และยังไม่ค้นหาตามรัศมี (PostGIS)
- **ข้อความทางกฎหมาย**: ข้อกำหนด/นโยบายใน `/legal/*` เป็นฉบับร่าง ต้องให้ทนายตรวจก่อนเปิดใช้
- **แผนที่**: tile ของ OpenStreetMap ใช้ได้เฉพาะช่วงพัฒนา production ควรใช้ผู้ให้บริการเชิงพาณิชย์ (`NEXT_PUBLIC_MAP_TILE_URL`)
- **Investor tools** (พอร์ต, yield) และหน้า "เปรียบเทียบทรัพย์" ตาม design
