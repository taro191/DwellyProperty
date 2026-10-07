# Dwelly Property

แพลตฟอร์มอสังหาริมทรัพย์ (ซื้อ / ขาย / เช่า / ที่ดิน) ที่เน้นประกาศที่ตรวจสอบแล้ว พร้อมระบบหลังบ้านสำหรับทีมงาน
**Stack:** Node.js 20.9+ · Next.js 16 · MySQL 8 · Drizzle ORM · Better Auth

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `design/` | ต้นแบบจาก Figma Make (`public/dwelly.min.html`) ใช้เป็น reference เท่านั้น |
| `docs/` | `SPEC.md` (สเปกจาก design), `GAP-ANALYSIS.md`, `DB-SCHEMA.md` (ฐานข้อมูลและโมเดลความปลอดภัย) |
| `web/` | แอปทั้งหมด ทั้งหน้าเว็บผู้ใช้, ศูนย์ผู้ขาย และ `/admin` |
| `web/src/server/` | ฐานข้อมูล (`db/`), auth, storage และ business rules (`services/`) |
| `web/drizzle/` | SQL migrations |

## ติดตั้งบน host (production)

**Plesk (Hostatom):** ดูขั้นตอนแบบละเอียดใน [docs/DEPLOY-PLESK.md](docs/DEPLOY-PLESK.md)

1. สร้างฐานข้อมูล MySQL 8.0 ขึ้นไป ใช้ charset `utf8mb4` และสร้าง user ให้แอป
2. ตั้งค่าแอป:
   ```bash
   cd web
   cp .env.example .env.local   # ใส่ DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_SITE_URL, SMTP_*
   npm ci
   npm run db:migrate           # สร้างตารางทั้งหมด
   npm run build
   npm start                    # รันที่พอร์ต 3000 (ตั้ง PORT ได้) แล้วให้ nginx หรือ panel ของ host proxy เข้ามา
   ```
3. ตั้ง cron ทุกชั่วโมง: `cd /path/to/web && npm run maintenance`
4. backup ทั้งฐานข้อมูลและโฟลเดอร์ `STORAGE_DIR` (รูปและเอกสาร)
5. **สร้าง admin คนแรก:** `npm run admin:create -- --email you@example.com --password <รหัสผ่านที่แข็งแรง>`

ข้อควรระวัง:
- **รันเป็นโปรเซสเดียว:** แชท realtime ใช้ event bus ภายในโปรเซส ถ้าจะใช้ cluster/PM2 หลาย instance ต้องเปลี่ยนเป็น Redis
- **nginx:** ถ้าอยู่หลัง nginx ให้ปิด buffering ของ `/api/chat/` (แอปส่ง header `X-Accel-Buffering: no` ให้แล้ว)
- **ขนาดไฟล์อัปโหลด:** ตั้ง `client_max_body_size` อย่างน้อย 12M

### Login
- **อีเมล + รหัส OTP:** ต้องตั้ง SMTP ถ้าไม่ตั้ง รหัสจะพิมพ์ใน log ของ server (ใช้ได้เฉพาะตอน dev)
- **Google:** สร้าง OAuth client โดยใช้ callback `{SITE_URL}/api/auth/callback/google`
- **LINE Login:** สร้าง channel ที่ LINE Developers โดยใช้ callback `{SITE_URL}/api/auth/callback/line` ต้องขอสิทธิ์ email ถ้าต้องการอีเมลจริง (ถ้าไม่มีสิทธิ์ ระบบจะใช้อีเมลสำรองให้)
- ปุ่ม Google/LINE จะแสดงเฉพาะเมื่อใส่ค่าใน `.env.local` แล้ว

## พัฒนาบนเครื่องตัวเอง (ไม่ต้องติดตั้ง MySQL)

```bash
cd web
npm install
npm run dev:db        # ดาวน์โหลด MySQL ชั่วคราว + migrate + seed แล้วพิมพ์ DATABASE_URL (ข้อมูลหายเมื่อปิด)
# ใส่ DATABASE_URL ที่ได้ และ BETTER_AUTH_SECRET ใน .env.local แล้วเปิดอีก terminal:
npm run dev           # http://localhost:3000
```
ถ้ามี MySQL อยู่แล้ว ใช้ `npm run db:migrate && npm run db:seed` แทน (**ห้ามรัน seed บน production**)

**บัญชีทดสอบจาก seed:** รหัสผ่านทุกบัญชีคือ `Dwelly@1234` (ล็อกอินด้วยแท็บ "รหัสผ่าน")

| อีเมล | บทบาท |
|---|---|
| `admin@dwelly.local` | Super Admin (`/admin` ทุกเมนู) |
| `moderator@dwelly.local` | Moderator |
| `owner@dwelly.local`, `owner2@dwelly.local` | เจ้าของทรัพย์ |
| `agent@dwelly.local` | นายหน้า (หัวหน้า Pod) |
| `buyer@dwelly.local` | ผู้ซื้อ |

## คำสั่ง

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run typecheck && npm run lint` | ตรวจ type และ lint |
| `npm test` | ทดสอบ business rules บน MySQL จริง 24 เคส (ครั้งแรกจะดาวน์โหลด MySQL) |
| `npm run db:generate` | สร้าง migration ใหม่หลังแก้ `src/server/db/schema.ts` |
| `npm run db:migrate` | รัน migrations |
| `npm run maintenance` | งานรายชั่วโมง |

## สถานะ (2026-10-07)

**เสร็จแล้ว** (ทดสอบ end-to-end บน MySQL 8.4 แล้ว)
- **ล็อกอิน:** อีเมล OTP, รหัสผ่าน, Google, LINE และ onboarding พร้อม consent PDPA
- **ฝั่งผู้ซื้อ:** ค้นหา + ตัวกรอง + แผนที่, หน้าประกาศ (SEO), บันทึกทรัพย์, สอบถาม, นัดชม, ยื่นข้อเสนอ/ต่อรองราคา, แชท realtime, แจ้งเตือน, รายงานประกาศ
- **ศูนย์ผู้ขาย:** ลงประกาศ, อัปโหลดรูป, ขั้นตอนสถานะ, leads, นัดหมาย, ข้อเสนอ, Co-Agent commission, นายหน้า/Pod
- **ยืนยันตัวตน:** ส่งเอกสาร KYC / ใบอนุญาตนายหน้า / โฉนด
- **Admin:** ตรวจประกาศ, ตรวจเอกสาร, รายงานปัญหา, ผู้ใช้, Pods, Partner, Hubs/Zones, ลบบัญชี (PDPA), audit log, ทีมงาน

**ยังไม่ได้ทำ**
- **ระบบชำระเงิน:** มี `services/billing.ts` แล้ว แต่ยังต้องเลือกผู้ให้บริการ (Omise / 2C2P) แล้วทำหน้า checkout และ webhook
- **แจ้งเตือนนอกแอป:** ทาง LINE OA / email
- **ค้นหาภาษาไทย:** ยังไม่มีการตัดคำและการค้นหาตามรัศมี
- **ข้อความทางกฎหมาย:** `/legal/*` เป็นฉบับร่าง ต้องให้ทนายตรวจ
- **แผนที่:** production ควรใช้ tile เชิงพาณิชย์ (`NEXT_PUBLIC_MAP_TILE_URL`)
- **ฟีเจอร์อื่นตาม design:** Investor tools และหน้าเปรียบเทียบทรัพย์
