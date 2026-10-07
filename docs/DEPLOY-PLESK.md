# ติดตั้งบน Plesk (Hostatom) — dwellyproperty.yaydang.com

ใช้ได้กับ Plesk Obsidian 18 ที่มีเมนู Git, Node.js, Databases และ Scheduled Tasks โดยไม่ต้องมี SSH
ตัวอย่างนี้ deploy โค้ดไปที่โฟลเดอร์ `/dwelly` ของ subscription และเก็บไฟล์อัปโหลดไว้ที่ `/dwelly-storage`

## 1. ฐานข้อมูล (Databases → Add Database)
1. ตั้งชื่อเช่น `dwelly` เลือกเซิร์ฟเวอร์ MySQL แล้วสร้าง user และรหัสผ่านของฐานข้อมูล
2. ตรวจเวอร์ชันฐานข้อมูล ต้องเป็น **MySQL 8.0 ขึ้นไป** หรือ MariaDB 10.6 ขึ้นไป
3. จดค่าไว้เขียนเป็น `DATABASE_URL`:
   `mysql://USER:PASSWORD@localhost:3306/dwelly`
   ถ้ารหัสผ่านมีอักขระพิเศษ เช่น `@ : / #` ต้อง URL-encode ก่อน

## 2. ดึงโค้ดจาก GitHub (Git → Add Repository)
- **ถ้าเคยกดเพิ่ม repo แล้ว error:** ลบโฟลเดอร์ `git/DwellyProperty` ที่ค้างอยู่ใน File Manager ก่อน
- **Remote Git hosting:** `https://github.com/taro191/DwellyProperty.git` (repo เป็น public จึงไม่ต้องใช้ key)
- **Branch:** `main`
- **Deployment mode:** Automatic
- **Server path:** `/dwelly`

## 3. ไฟล์ตั้งค่า (Files → `/dwelly/web` → สร้างไฟล์ `.env.local`)
```
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/dwelly
BETTER_AUTH_SECRET=<สุ่มยาว 32+ ตัวอักษร>
NEXT_PUBLIC_SITE_URL=https://dwellyproperty.yaydang.com
STORAGE_DIR=/var/www/vhosts/yaydang.com/dwelly-storage
CRON_SECRET=<สุ่มยาว 32+ ตัวอักษร>
SMTP_HOST=...        # ใช้ส่งรหัส OTP (ใช้ mail ของ Plesk ได้)
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
MAIL_FROM=Dwelly <no-reply@yaydang.com>
```
- `.env.local` ไม่ได้อยู่ใน git การ pull ครั้งต่อไปจึงไม่ทับไฟล์นี้
- ต้องสร้างโฟลเดอร์ `dwelly-storage` ไว้ก่อน

## 4. Node.js (Websites & Domains → Node.js)
| ช่อง | ค่า |
|---|---|
| Node.js Version | 24.x |
| Package Manager | npm |
| Application Root | `/dwelly/web` |
| Document Root | `/dwelly/web/public` |
| Application Mode | production |
| Application Startup File | `app.js` |

แล้วกดตามลำดับ:
1. **Enable Node.js**
2. **NPM install**
3. แท็บ **Run Node.js commands** รัน 2 คำสั่งนี้:
   - `run db:migrate` (สร้างตาราง)
   - `run build` (ใช้เวลา 1–3 นาที)
4. **Restart App**

> ถ้า `run build` ล้มเหลวเพราะหน่วยความจำไม่พอ ให้ build บนเครื่องตัวเอง (`npm run build`) แล้วอัปโหลดโฟลเดอร์ `web/.next` ขึ้นไปแทน

## 5. SSL
SSL/TLS Certificates → Let's Encrypt → ติ๊กให้ redirect HTTP เป็น HTTPS

## 6. งานรายชั่วโมง (Scheduled Tasks → Add Task)
- **Task type:** Fetch a URL
- **URL:** `https://dwellyproperty.yaydang.com/api/cron/maintenance?token=<CRON_SECRET>`
- **Run:** Hourly

## 7. สร้าง admin คนแรก
1. สมัครสมาชิกผ่านเว็บ
2. เปิด Databases → phpMyAdmin แล้วรัน:
```sql
INSERT INTO staff_members (user_id, role, active, created_at, updated_at)
SELECT id, 'super_admin', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3) FROM user WHERE email = 'you@example.com';
```

## อัปเดตเวอร์ชันใหม่
1. push ขึ้น GitHub → ใน Plesk: Git → **Pull now** (หรือตั้ง webhook ให้ดึงอัตโนมัติ)
2. Node.js → **NPM install**
3. Run Node.js commands: `run db:migrate` และ `run build`
4. **Restart App**

## ข้อมูลทดสอบ (ห้ามใช้บนเว็บจริง)
`run db:seed` จะสร้างบัญชีทดสอบ `*@dwelly.local` ที่ใช้รหัสผ่านเดียวกันทั้งหมด จึงใช้ได้เฉพาะ staging
