-- =============================================================================
-- Dwelly seed data (local development / staging only — never run on production)
-- Generated from the Figma Make prototype (design/public/dwelly.min.html).
-- Demo accounts: admin|moderator|owner|owner2|agent|buyer @dwelly.local / Dwelly@1234
-- =============================================================================

-- Demo auth users (handle_new_user trigger creates profiles, private contact and roles)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'admin@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dwelly Admin","primary_role":"buyer"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', '{"sub":"00000000-0000-4000-a000-000000000001","email":"admin@dwelly.local"}', 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'moderator@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ทีมตรวจสอบ Dwelly","primary_role":"buyer"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', '{"sub":"00000000-0000-4000-a000-000000000002","email":"moderator@dwelly.local"}', 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'owner@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"พัชริดา (เจ้าของทรัพย์)","primary_role":"owner"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', '{"sub":"00000000-0000-4000-a000-000000000003","email":"owner@dwelly.local"}', 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'agent@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"วรภพ ชัยสิทธิ์","primary_role":"agent"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', '{"sub":"00000000-0000-4000-a000-000000000004","email":"agent@dwelly.local"}', 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'buyer@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ณัฐนนท์ (ผู้ซื้อทดสอบ)","primary_role":"buyer"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005', '{"sub":"00000000-0000-4000-a000-000000000005","email":"buyer@dwelly.local"}', 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000006', 'authenticated', 'authenticated', 'owner2@dwelly.local', extensions.crypt('Dwelly@1234', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"คุณนพดล (เจ้าของบ้านให้เช่า)","primary_role":"owner"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000006', '{"sub":"00000000-0000-4000-a000-000000000006","email":"owner2@dwelly.local"}', 'email', now(), now(), now());

insert into public.staff_members (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'super_admin'),
  ('00000000-0000-4000-a000-000000000002', 'moderator');

update public.profile_private set phone = '081-888-9922', phone_verified = true, line_id = 'worapop.agent' where user_id = '00000000-0000-4000-a000-000000000004';
update public.profile_private set phone = '089-222-3344', line_id = 'patcharida' where user_id = '00000000-0000-4000-a000-000000000003';
update public.profile_private set phone = '084-555-1234' where user_id = '00000000-0000-4000-a000-000000000006';
update public.profiles set is_kyc_verified = true, kyc_verified_at = now() where id in ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003');

insert into public.agent_profiles (user_id, english_name, title, company_name, license_no, license_verified, experience_years, specialized_categories, rating_avg, rating_count, closed_deals)
values ('00000000-0000-4000-a000-000000000004', 'Worapop Chaisit', 'Senior Certified Real Estate Specialist', 'Salaya Prime Estate', 'TREBA-2025-0148', true, 8, array['condo', 'land']::public.property_category[], 4.95, 36, 48);

-- Zones
insert into public.zones (slug, name_th, name_en, icon, description, center_lat, center_lng, sort_order) values
  ('land', 'แปลงที่ดินสวย (Land Zone)', 'Land Zone', '🏞️', 'โฉนดครุฑแดง ทำเลทองศาลายา', null, null, 0),
  ('near-mahidol', 'Near Mahidol', 'Near Mahidol', '🎓', 'Within 2 km of campus', 13.7946, 100.3237, 1),
  ('move-in-ready', 'Move-in Ready', 'Move-in Ready', '✨', 'Immediate availability', null, null, 2),
  ('investment', 'Investment', 'Investment', '📈', 'High rental yield', null, null, 3),
  ('under-2m', 'Under ฿2M', 'Under ฿2M', '🏷️', 'Budget-friendly picks', null, null, 4),
  ('owner-direct', 'Owner Direct', 'Owner Direct', '🤝', 'No markup, deal direct', null, null, 5),
  ('pod-picks', 'Agency Pod Picks', 'Agency Pod Picks', '🏆', 'Verified curated selections', null, null, 6);

insert into public.agency_pods (id, code, name, description, zone_id, leader_id, status, trust_score, insurance_coverage, verifications, rating_avg, rating_count)
values ('00000000-0000-4000-b000-000000000001', 'POD-SLY-01', 'Salaya Prime Estate Pod', 'ทีมนายหน้าที่ผ่านการยืนยันในโซนศาลายา',
        (select id from public.zones where slug = 'near-mahidol'), '00000000-0000-4000-a000-000000000004', 'verified', 92, 10000000,
        '{"license_verified":true,"identity_verified":true,"escrow_ready":true,"zero_markup_guaranteed":true,"background_checked":true}', 4.95, 36);

-- Plans
insert into public.plans (id, audience, name, badge, description, price_thb, period, features, quotas, sort_order) values
  ('owner-free', 'owner', 'Owner Starter', 'ฟรีตลอดชีพ', 'สำหรับเจ้าของทรัพย์ที่ต้องการลงขายหรือปล่อยเช่า 1 รายการด้วยตนเอง', 0, 'lifetime', '["ลงประกาศขายหรือปล่อยเช่า 1 รายการพร้อมกัน","เข้าร่วมแคมเปญ Dwelly Hub ฟรี","รับ Leads ผู้สนใจซื้อ/เช่าโดยตรงไม่ผ่านคนกลาง","แชทแบบ Real-time และระบบแจ้งเตือนผ่าน App","เชื่อมต่อสัญญาและตั้งค่า Dwelly Commission ได้"]', '{"active_listings":1}', 0),
  ('owner-pro', 'owner', 'Owner Pro Verified', '⭐ ยอดนิยม', 'ปิดการขายเร็วขึ้น 3 เท่า ด้วยตราประทับยืนยันกรรมสิทธิ์และโควตาดันประกาศฟรี', 399, 'month', '["ลงประกาศได้สูงสุด 5 รายการพร้อมกัน (คอนโด/บ้าน/ที่ดิน)","ฟรี! โควตาดันประกาศ Hot Deal 1 ครั้ง/เดือน (มูลค่า 499.-)","ตราสัญลักษณ์ Verified Deed & Ownership ผ่านการตรวจโฉนด","ระบบประกาศ Co-Agent ให้เครือข่ายนายหน้าช่วยปล่อยทรัพย์","ระบบล็อกสิทธิ์ลูกค้า Lead Lock ป้องกันการแย่งดีล","Dashboard สถิติคนดูห้องจริงและการกดเซฟ"]', '{"active_listings":5,"free_boosts_per_month":1}', 1),
  ('owner-vip', 'owner', 'Owner VIP Speed Close', 'เร็วที่สุด', 'สิทธิพิเศษครบวงจร ดันประกาศสูงสุดพร้อมทีมงานพาชมและช่วยทำสัญญา', 1290, 'month', '["ลงประกาศได้ไม่จำกัดจำนวนรายการ","ฟรี! Dwelly Spotlight Banner สัปดาห์ละ 1 ครั้ง","ติดป้าย Hot Deal ทุกรายการในพอร์ต","ทีมงานฝ่ายนิติกรรมช่วยตรวจเช็คสัญญาจะซื้อจะขาย / สัญญาเช่า","บริการถ่ายภาพมุมกว้างและจัดทำ Virtual Tour เสมือนจริง","แจ้งเตือนกลุ่มนักลงทุน VIP Cash Buyer ทันทีที่ลงทรัพย์"]', '{"active_listings":20,"free_boosts_per_month":4}', 2),
  ('agent-starter', 'agent', 'Agent Starter', 'เริ่มต้น', 'เครื่องมือปิดการขายครบมือสำหรับนายหน้าอิสระที่ต้องการรับงาน Co-Agent', 490, 'month', '["ดูแลพอร์ตทรัพย์สินได้สูงสุด 15 รายการ","เข้าถึงห้อง Open Co-Agent จากเจ้าของทรัพย์โดยตรง","ระบบล็อกสิทธิ์ลูกค้า (Lead Lock 14 วัน) คุ้มครองคอมมิชชั่น","ระบบบันทึกพาชมห้องจริง ซิงก์กับแดชบอร์ดเจ้าของอัตโนมัติ","โควตาดันประกาศ Top Rank ฟรี 2 ครั้ง/เดือน"]', '{"active_listings":15}', 3),
  ('agency-pro', 'agent', 'Agency Pro Team', '🔥 ยอดนิยม', 'แพลตฟอร์มบริหารทีมงานนายหน้า คลังทรัพย์ Co-Agent และระบบดันประกาศครบวงจร', 1990, 'month', '["ดูแลพอร์ตทรัพย์สินไม่จำกัดจำนวนรายการ","สร้างบัญชีทีมงานนายหน้าได้สูงสุด 8 สิทธิ์ (Sub-Agent Accounts)","ระบบกระจาย Lead อัตโนมัติ (Smart Lead Routing) ตามพื้นที่และภาษา","ฟรี! 12 เครดิตดันประกาศ Agency Pro Boost ประจำเดือน (มูลค่า 2,500.-)","ระบบออกใบเสนอราคาและหนังสือล็อกสิทธิ์ดิจิทัลประทับตรา","แสดงตราสัญลักษณ์ \"Salaya Dwelly Partner Agency\" เพิ่มความน่าเชื่อถือ","รายงานสถิติทีมงานและยอดคอมมิชชั่นสะสมแบบรวมศูนย์"]', '{"active_listings":100,"seats":10}', 4),
  ('agency-enterprise', 'agent', 'Agency Enterprise Master', 'สำหรับองค์กร', 'โซลูชันระดับองค์กร รองรับทีมงานไม่จำกัด การเชื่อมต่อ API และที่ปรึกษาเฉพาะบุคคล', 4900, 'month', '["รองรับทีมงานนายหน้าไม่จำกัดจำนวนคน","สิทธิ์โควตาดันประกาศ Spotlight Banner 4 ครั้ง/เดือน","รับสิทธิ์บริหารจัดการทรัพย์สิน Exclusive จากพาร์ทเนอร์สถาบันการเงิน","API สำหรับเชื่อมต่อสต็อกทรัพย์กับ CRM ของบริษัท","Dedicated Account Manager ดูแลและสนับสนุนทางเทคนิค 24/7"]', '{"active_listings":null,"seats":null}', 5),
  ('inv-basic', 'investor', 'Investor Free', 'ทั่วไป', 'สำรวจทรัพย์หลุดจองและอสังหาริมทรัพย์ผลตอบแทนสูงในทำเลศาลายา', 0, 'lifetime', '["ค้นหาทรัพย์คอนโดและที่ดินผลตอบแทนมาตรฐาน","เครื่องคำนวณอัตราผลตอบแทนเบื้องต้น (Rental Yield Calc)","บันทึกทรัพย์ที่สนใจเข้า Shortlist ได้ 10 รายการ","เปรียบเทียบทรัพย์สินพร้อมกันได้ 2 รายการ"]', '{}', 6),
  ('inv-club', 'investor', 'Investor Club Pro', '👑 แนะนำ', 'รับดีลหลุดจำนอง ทรัพย์ Yield 7%+ ก่อนใคร พร้อมข้อมูลเจาะลึกผู้เช่าศาลายา', 590, 'month', '["Instant Alert: แจ้งเตือนทรัพย์ราคาต่ำกว่าตลาดทันทีที่ลงประกาศ","Exclusive Access: สิทธิ์เข้าถึงห้อง Yield 7-10% และที่ดินแปลงสวย","ระบบ Speed Offer ยื่นข้อเสนอราคาเงินสดตรงถึงเจ้าของทันที","รายงานอัตราผู้เช่า ม.มหิดล / รพ.ศาลายา และคาดการณ์ค่าเช่า 3 ปี","เปรียบเทียบเชิงลึกได้ไม่จำกัดรายการ","ข้อมูลราคาประเมินราชการและผังเมืองสีส้ม/เหลืองครบถ้วน"]', '{"deal_alerts":true}', 7),
  ('inv-elite', 'investor', 'Institutional & Land Elite', 'VIP Elite', 'วิเคราะห์แปลงที่ดินศักยภาพสูง ดีลซื้อเหมายกชั้น และบริการที่ปรึกษาส่วนตัว', 2490, 'month', '["เข้าถึงแปลงที่ดินขนาดใหญ่ 5-50 ไร่ พร้อมข้อมูลหน้ากว้างและแนวเวนคืน","ดีลพิเศษ Bulk Buy / ซื้อยกชั้นจากเจ้าของโครงการในราคาพิเศษ","รายงานวิเคราะห์ความเป็นไปได้ของโครงการ (Feasibility Study)","จับคู่นายหน้ามือฉมังช่วยหาผู้เช่าเข้าพอร์ตแบบการันตี","ระบบนัดสำรวจแปลงที่ดินพร้อมโดรนสำรวจแนวเขตและที่ปรึกษา"]', '{"deal_alerts":true,"advisor":true}', 8);

insert into public.boost_products (id, name, description, price_thb, duration_days, placement, sort_order) values
  ('boost-24h', 'ดันขึ้นอันดับแรก (Top Rank 24 ชม.)', 'ดันทรัพย์สินขึ้นบนสุดของผลการค้นหาและโซนทำเลทันที 24 ชม. เหมาะสำหรับช่วงเวลาที่มีคนค้นหามากที่สุด', 149, 1, 'top_rank', 0),
  ('boost-7d', 'ป้าย Hot Deal / ปิดด่วนพิเศษ (7 วัน)', 'ติดป้ายไฮไลต์สีส้มเร่งด่วน พร้อมแสดงในแถบ Hot Deal หน้าแรกของ Dwelly Hub ตลอด 7 วัน', 499, 7, 'hot_deal', 1),
  ('boost-spotlight', 'Dwelly Spotlight Banner (14 วัน)', 'นำทรัพย์ขึ้นแบนเนอร์ใหญ่บนสุดของหน้าแรกและแผนที่ Dwelly Interactive Map ตลอด 14 วันเต็ม', 999, 14, 'spotlight_banner', 2),
  ('boost-combo', 'Combo Booster 30 วัน (ปิดการขายชัวร์)', 'แพ็กเกจจัดเต็ม 1 เดือน รวมป้าย Hot Deal + Top Rank อัตโนมัติทุกสัปดาห์ + แบนเนอร์หน้าแรก', 1890, 30, 'featured', 3);

-- Listings (all active; agent assigned where the prototype listed an agency seller)
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'near-mahidol'), 'sale_or_rent', 'condo', 'active', 'Condo A · Aspire Salaya', 'สถานะ: Immediate', 2350000, 8500, 32, null, 1, 1, 8, 'E', 'full'::public.furnishing, 1500, '{}', array['Ready to Move', 'Near Mahidol', 'Owner Direct', 'Speed Deal']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya', 13.78960, 100.31770, true, now(), now() + interval '14 days', 142, 28, 8, '2026-09-10T08:00:00.000Z', now() + interval '90 days', '2026-09-10T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 5, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'Condo B · Lumpini Park', 'สถานะ: October 2026', 1980000, 6500, 29, null, 1, 1, 5, 'W', 'partial'::public.furnishing, 1200, '{}', array['Ready to Move', 'Near Bus Stop', 'Under ฿2M']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya', 13.79360, 100.31870, true, now(), null, 95, 14, 4, '2026-08-10T08:00:00.000Z', now() + interval '90 days', '2026-08-10T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 0 from p
)
select 1;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'Condo C · The Breeze', 'สถานะ: Immediate', 2750000, 12000, 35, null, 1, 1, 14, 'N', 'full'::public.furnishing, 1800, '{}', array['Investment', 'High Floor', 'Pool View', 'Speed Deal']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya', 13.79760, 100.31970, true, now(), now() + interval '14 days', 210, 45, 12, '2026-09-16T08:00:00.000Z', now() + interval '90 days', '2026-09-16T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 6, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'near-mahidol'), 'sale_or_rent', 'condo', 'active', 'Condo D · Plum Suite', 'สถานะ: November 2026', 1750000, 5800, 26, null, 1, 1, 3, 'S', 'unfurnished'::public.furnishing, 900, '{}', array['Under ฿2M', 'Near Mahidol']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya', 13.79060, 100.32070, true, now(), null, 64, 9, 2, '2026-09-01T08:00:00.000Z', now() + interval '90 days', '2026-09-01T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80', 0 from p
)
select 1;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', null, (select id from public.zones where slug = 'near-mahidol'), 'sale_or_rent', 'condo', 'active', 'Condo E · Kave Town', 'สถานะ: Immediate', 2100000, 9000, 31, null, 1, 1, 6, 'E', 'full'::public.furnishing, 1350, '{}', array['Ready to Move', 'Pool View', 'Near Mahidol']::text[], 'นครปฐม', 'พุทธมณฑล', 'Phutthamonthon', 13.79460, 100.32170, true, now(), null, 118, 22, 5, '2026-09-05T08:00:00.000Z', now() + interval '90 days', '2026-09-05T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', 0 from p
)
select 1;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'Studio · Rich Park', 'สถานะ: December 2026', 1450000, 5000, 23, null, 0, 1, 2, 'W', 'partial'::public.furnishing, 700, '{}', array['Under ฿2M', 'Studio', 'Student Friendly']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya', 13.79860, 100.32270, false, null, null, 52, 8, 1, '2026-09-12T08:00:00.000Z', now() + interval '90 days', '2026-09-12T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80', 0 from p
)
select 1;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินแปลงสวย 1 ไร่ ติดถนนพุทธมณฑลสาย 4 - ศาลายา', 'สถานะ: พร้อมโอนทันที', 14000000, null, null, 400, null, null, null, null, null, null, '{"rai":1,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีส้ม (ที่อยู่อาศัยหนาแน่นปานกลาง)","road_frontage_m":32,"road_type":"ถนนคอนกรีต 4 เลนสาธารณะ","shape":"สี่เหลี่ยมผืนผ้าสวย หน้ากว้าง","utilities":["ไฟฟ้า 3 เฟส","น้ำประปาภูมิภาค","ท่อระบายน้ำ","ถมแล้วระดับเสมอถนน"],"suitable_for":["สร้างบ้านหรู/พูลวิลล่า","อาคารสำนักงาน/โชว์รูม","คาเฟ่-ร้านอาหาร","ซื้อเก็งกำไร"],"price_per_sqwa":35000}', array['ที่ดิน', 'โฉนดครุฑแดง', 'ติดถนนใหญ่', 'ผังสีส้ม', 'Speed Deal']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya · Phutthamonthon', 13.79160, 100.32370, true, now(), now() + interval '14 days', 380, 72, 18, '2026-09-20T08:00:00.000Z', now() + interval '90 days', '2026-09-20T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 4, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินริมน้ำคลองทวีวัฒนา-ศาลายา 200 ตร.ว. บรรยากาศธรรมชาติ', 'สถานะ: พร้อมโอนทันที', 4800000, null, null, 200, null, null, null, null, null, null, '{"rai":0,"ngan":2,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีเหลือง (ที่อยู่อาศัยหนาแน่นน้อย)","road_frontage_m":20,"road_type":"ถนนคอนกรีตสาธารณะ กว้าง 6 ม.","shape":"สี่เหลี่ยมผืนผ้า ด้านหลังติดคลองน้ำใส","utilities":["ไฟฟ้าพร้อม","น้ำประปาพร้อม","ถมแล้วดินแน่น"],"suitable_for":["บ้านเดี่ยวริมน้ำสไตล์รีสอร์ต","โฮมสเตย์","สวนพักผ่อนส่วนตัว"],"price_per_sqwa":24000}', array['ที่ดิน', 'ริมน้ำ', 'โฉนดครุฑแดง', 'เหมาะสร้างบ้าน', 'Owner Direct']::text[], 'กรุงเทพมหานคร', 'ทวีวัฒนา', 'Salaya · Khlong Thawi Watthana', 13.78100, 100.35100, true, now(), null, 245, 53, 11, '2026-09-18T08:00:00.000Z', now() + interval '90 days', '2026-09-18T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 5, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินแปลงใหญ่ 5 ไร่ ใกล้มหาวิทยาลัยมหิดล ศาลายา เหมาะพัฒนาโครงการ', 'สถานะ: พร้อมเจรจาดีล', 45000000, null, null, 2000, null, null, null, null, null, null, '{"rai":5,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีส้ม (ที่อยู่อาศัยหนาแน่นปานกลาง)","road_frontage_m":65,"road_type":"ถนนคอนกรีตเทศบาล 8 เมตร","shape":"หน้ากว้าง รูปแปลงสวยสี่เหลี่ยมสมมาตร","utilities":["ไฟฟ้าแรงสูง 3 เฟส","ท่อระบายน้ำเทศบาล","ประปาขนาดใหญ่"],"suitable_for":["คอนโด Low-Rise","หอพักนักศึกษาพรีเมียม","หมู่บ้านจัดสรรขนาดกะทัดรัด"],"price_per_sqwa":22500}', array['ที่ดินแปลงใหญ่', 'ใกล้มหิดล', 'ผังสีส้ม', 'Investment', 'Agency Pod Picks']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya · Near Mahidol Univ.', 13.79960, 100.32570, true, now(), now() + interval '14 days', 510, 89, 24, '2026-09-14T08:00:00.000Z', now() + interval '90 days', '2026-09-14T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 3.5, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินสวนเกษตร-โคกหนองนา 2 ไร่ คลองมหาสวัสดิ์ ศาลายา อากาศบริสุทธิ์', 'สถานะ: พร้อมโอน', 6900000, null, null, 800, null, null, null, null, null, null, '{"rai":2,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีเขียว (ชนบทและเกษตรกรรม)","road_frontage_m":28,"road_type":"ถนนคอนกรีตสาธารณะ 6 เมตร","shape":"สี่เหลี่ยมผืนผ้า สวนร่มรื่นมีร่องสวนดั้งเดิม","utilities":["ไฟฟ้าเข้าถึง","น้ำประปาเข้าถึง","ติดคลองส่งน้ำธรรมชาติ"],"suitable_for":["บ้านสวนเกษตรเกษียณ","คาเฟ่วิวสวนธรรมชาติ","แคมป์ปิ้ง & สตูดิโอ"],"price_per_sqwa":8625}', array['ที่ดิน', 'สวนเกษตร', 'ธรรมชาติ', 'โฉนดครุฑแดง', 'Under ฿10M']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya · Khlong Maha Sawat', 13.81800, 100.33300, true, now(), null, 180, 38, 7, '2026-09-11T08:00:00.000Z', now() + interval '90 days', '2026-09-11T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 4.5, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินถมแล้ว 100 ตร.ว. ซอยศาลายา 9 ใกล้สถานีรถไฟศาลายา เหมาะปลูกบ้าน', 'สถานะ: พร้อมโอนทันที', 3200000, null, null, 100, null, null, null, null, null, null, '{"rai":0,"ngan":1,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีส้ม (ที่อยู่อาศัยหนาแน่นปานกลาง)","road_frontage_m":16,"road_type":"ถนนคอนกรีต กว้าง 6 ม.","shape":"สี่เหลี่ยมจัตุรัสสวย ถมสูงกว่าถนน 30 ซม.","utilities":["ไฟฟ้าพร้อม","น้ำประปาพร้อม","ท่อระบายน้ำเทศบาล"],"suitable_for":["สร้างบ้านพักอาศัย","โฮมออฟฟิศ","หอพักขนาดย่อม"],"price_per_sqwa":32000}', array['ที่ดิน', 'ถมแล้ว', 'โฉนดครุฑแดง', 'ใกล้สถานีรถไฟ', 'Ready to Build']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya Soi 9 · Phutthamonthon', 13.79660, 100.32770, true, now(), now() + interval '14 days', 312, 61, 14, '2026-09-22T08:00:00.000Z', now() + interval '90 days', '2026-09-22T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 4, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินเพื่อการพาณิชย์ 3 ไร่ หน้ากว้าง 80 ม. ติดถนนบรมราชชนนี ใกล้เซ็นทรัล ศาลายา', 'สถานะ: พร้อมทำสัญญาจะซื้อจะขาย', 36000000, null, null, 1200, null, null, null, null, null, null, '{"rai":3,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","zoning":"ผังสีแดง (พาณิชยกรรม)","road_frontage_m":80,"road_type":"ถนนบรมราชชนนี คู่ขนาน 10 เลน","shape":"หน้ากว้างมาก เหมาะทำโชว์รูมหรือคอมมูนิตี้มอลล์","utilities":["ไฟฟ้า 3 เฟสแรงสูง","ประปาขนาดใหญ่","ระบบระบายน้ำหลัก"],"suitable_for":["โชว์รูมรถยนต์","คอมมูนิตี้มอลล์","ปั๊มน้ำมัน/สถานีชาร์จ EV","โรงพยาบาล/คลินิก"],"price_per_sqwa":30000}', array['ที่ดินแปลงใหญ่', 'ติดถนนใหญ่', 'โฉนดครุฑแดง', 'Commercial', 'เซ็นทรัลศาลายา']::text[], 'นครปฐม', 'พุทธมณฑล', 'Borommaratchachonnani Rd. · Salaya', 13.78960, 100.32870, true, now(), now() + interval '14 days', 640, 110, 31, '2026-09-19T08:00:00.000Z', now() + interval '90 days', '2026-09-19T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 3, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000006', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'near-mahidol'), 'sale_or_rent', 'townhome', 'active', 'ทาวน์โฮม 2 ชั้น พฤกษาวิลล์ ศาลายา เลี้ยงสัตว์ได้ แต่งครบพร้อมอยู่', 'สถานะ: พร้อมเข้าอยู่ทันที', 3200000, 15000, 110, null, 3, 3, null, 'N', 'full'::public.furnishing, 800, '{}', array['ทาวน์โฮม', 'เลี้ยงสัตว์ได้', 'พร้อมเข้าอยู่', 'ใกล้ ม.มหิดล']::text[], 'นครปฐม', 'พุทธมณฑล', 'Salaya · Phutthamonthon Sai 4', 13.79360, 100.32970, true, now(), null, 290, 52, 16, '2026-09-21T08:00:00.000Z', now() + interval '90 days', '2026-09-21T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = 'near-mahidol'), 'sale_or_rent', 'condo', 'active', 'Condo Z · Elite Salaya Studio แต่งสไตล์มินิมอล เดินถึง ม.มหิดล 300 ม.', 'สถานะ: พร้อมเข้าอยู่ทันที', 1890000, 7500, 28, null, 1, 1, 5, 'E', 'full'::public.furnishing, 1100, '{}', array['เดินถึงมหิดล', 'สัญญา 1 ปี', 'พร้อมอยู่', 'เฟอร์ครบ + เครื่องซักผ้า']::text[], 'นครปฐม', 'พุทธมณฑล', 'Opposite Mahidol Univ. · Salaya', 13.79760, 100.31770, true, now(), null, 480, 95, 28, '2026-09-23T08:00:00.000Z', now() + interval '90 days', '2026-09-23T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000001', (select id from public.zones where slug = null), 'sale_or_rent', 'house', 'active', 'บ้านเดี่ยวหลังใหญ่ 2 ชั้น ให้เช่า หมู่บ้านลัดดารมย์ ปิ่นเกล้า-ศาลายา', 'สถานะ: 1 พ.ย. 2026', 8900000, 28000, 220, null, 4, 4, null, 'S', 'partial'::public.furnishing, 2200, '{}', array['บ้านเดี่ยวให้เช่า', '4 ห้องนอน', 'สวนรอบบ้าน', 'จอดรถ 2 คัน']::text[], 'นครปฐม', 'พุทธมณฑล', 'Borommaratchachonnani · Salaya', 13.79060, 100.31870, true, now(), null, 310, 44, 9, '2026-09-17T08:00:00.000Z', now() + interval '90 days', '2026-09-17T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'คอนโดหรู The Esse Asoke สุขุมวิท 21 ติด BTS อโศก & MRT สุขุมวิท', 'สถานะ: Immediate', 8900000, 35000, 48, null, 1, 1, 22, 'S', 'full'::public.furnishing, null, '{}', array['สุขุมวิท', 'ติดรถไฟฟ้า', 'ห้องมุม', 'วิวเมือง', 'Fully Furnished']::text[], 'กรุงเทพมหานคร', 'วัฒนา', 'อโศก-สุขุมวิท · กรุงเทพมหานคร', 13.73760, 100.55640, true, now(), now() + interval '14 days', 480, 95, 22, '2026-09-20T08:00:00.000Z', now() + interval '90 days', '2026-09-20T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'townhome', 'active', 'ทาวน์โฮมโมเดิร์น 3 ชั้น อารีย์สัมพันธ์ บรรยากาศร่มรื่น เหมาะโฮมออฟฟิศ', 'สถานะ: Immediate', 12500000, 48000, 220, null, 3, 3, null, 'N', 'partial'::public.furnishing, null, '{}', array['อารีย์', 'ทาวน์โฮม', 'โฮมออฟฟิศ', 'จอดรถ 2 คัน', 'ใกล้ทางด่วน']::text[], 'กรุงเทพมหานคร', 'พญาไท', 'อารีย์-พญาไท · กรุงเทพมหานคร', 13.78370, 100.54160, true, now(), null, 320, 58, 14, '2026-09-21T08:00:00.000Z', now() + interval '90 days', '2026-09-21T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'คอนโดวิวระเบียงดอยสุเทพ นิมมานเหมินท์ เชียงใหม่ แต่งครบสไตล์มินิมอล', 'สถานะ: Immediate', 2890000, 13500, 36, null, 1, 1, 6, 'W', 'full'::public.furnishing, null, '{}', array['นิมมาน', 'เชียงใหม่', 'วิวภูเขา', 'ใกล้มช.', 'Digital Nomad']::text[], 'เชียงใหม่', 'เมืองเชียงใหม่', 'นิมมานเหมินท์ · เชียงใหม่', 18.79540, 98.96570, true, now(), now() + interval '14 days', 410, 78, 19, '2026-09-22T08:00:00.000Z', now() + interval '90 days', '2026-09-22T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', null, (select id from public.zones where slug = null), 'sale_or_rent', 'house', 'active', 'บ้านเดี่ยวสองชั้น สไตล์โมเดิร์นนอร์ดิก 100 ตร.ว. สันทราย เชียงใหม่', 'สถานะ: Immediate', 4350000, 22000, 190, null, 3, 3, null, 'N', 'full'::public.furnishing, null, '{}', array['บ้านเดี่ยวเชียงใหม่', 'สันทราย', 'สวนรอบบ้าน', 'พร้อมอยู่']::text[], 'เชียงใหม่', 'สันทราย', 'สันทราย · เชียงใหม่', 18.85100, 99.03900, true, now(), null, 290, 49, 11, '2026-09-23T08:00:00.000Z', now() + interval '90 days', '2026-09-23T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', null, (select id from public.zones where slug = null), 'sale_or_rent', 'house', 'active', 'ลักชัวรี่พูลวิลล่า 3 ห้องนอน สระว่ายน้ำส่วนตัว ใกล้หาดบางเทา ภูเก็ต', 'สถานะ: Immediate', 18900000, 85000, 320, null, 3, 3, null, 'E', 'full'::public.furnishing, null, '{}', array['พูลวิลล่า', 'ภูเก็ต', 'บางเทา', 'สระว่ายน้ำส่วนตัว', 'Yield สูง']::text[], 'ภูเก็ต', 'ถลาง', 'บางเทา-เชิงทะเล · ภูเก็ต', 8.00000, 98.29500, true, now(), now() + interval '14 days', 650, 130, 35, '2026-09-19T08:00:00.000Z', now() + interval '90 days', '2026-09-19T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'คอนโดซีวิว ป่าตอง ภูเก็ต วิวอ่าวป่าตอง 180 องศา ปล่อยเช่ารายวัน/เดือนได้', 'สถานะ: Immediate', 3750000, 24000, 45, null, 1, 1, 7, 'W', 'full'::public.furnishing, null, '{}', array['ป่าตอง', 'ภูเก็ต', 'ซีวิว', 'ลงทุนปล่อยเช่า', 'ต่างชาติซื้อได้']::text[], 'ภูเก็ต', 'กะทู้', 'ป่าตอง · ภูเก็ต', 7.89410, 98.29740, true, now(), null, 380, 62, 16, '2026-09-24T08:00:00.000Z', now() + interval '90 days', '2026-09-24T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'คอนโดติดชายหาดจอมเทียน พัทยา วิวทะเลหน้ากว้าง ระเบียงรับลมทะเล', 'สถานะ: Immediate', 3490000, 17500, 42, null, 1, 1, 15, 'S', 'full'::public.furnishing, null, '{}', array['พัทยา', 'จอมเทียน', 'ติดทะเล', 'วิวทะเล', 'เช่าระยะสั้น-ยาว']::text[], 'ชลบุรี', 'บางละมุง', 'หาดจอมเทียน · พัทยา ชลบุรี', 12.88260, 100.87980, true, now(), null, 440, 85, 20, '2026-09-25T08:00:00.000Z', now() + interval '90 days', '2026-09-25T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = null), 'sale_or_rent', 'condo', 'active', 'คอนโดใกล้มหาวิทยาลัยขอนแก่น กังสดาล ตกแต่งครบ ผลตอบแทนเช่า 7.5%', 'สถานะ: Immediate', 1650000, 7900, 30, null, 1, 1, 4, 'N', 'full'::public.furnishing, null, '{}', array['ขอนแก่น', 'ใกล้มข.', 'Yield 7.5%', 'พร้อมผู้เช่า', 'กังสดาล']::text[], 'ขอนแก่น', 'เมืองขอนแก่น', 'กังสดาล-ม.ขอนแก่น · ขอนแก่น', 16.45640, 102.82660, true, now(), null, 260, 38, 12, '2026-09-26T08:00:00.000Z', now() + interval '90 days', '2026-09-26T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', null, null, (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินแปลงสวยวิวเขา 2 ไร่ แม่ออน เชียงใหม่ ติดลำธารและถนนสาธารณะ', null, 3600000, null, null, 800, null, null, null, null, null, null, '{"rai":2,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","road_frontage_m":40,"road_type":"ถนนลาดยางสาธารณะ กว้าง 6 ม.","shape":"สี่เหลี่ยมผืนผ้าหน้ากว้าง","utilities":["ไฟฟ้าเข้าถึง","น้ำประปาภูเขา"],"suitable_for":["สร้างบ้านพักตากอากาศ","โฮมสเตย์","คาเฟ่วิวเขา"],"price_per_sqwa":4500}', array['ที่ดินเชียงใหม่', 'แม่ออน', 'วิวเขา', 'ติดลำธาร', 'โฉนดครุฑแดง']::text[], 'เชียงใหม่', 'แม่ออน', 'แม่ออน · เชียงใหม่', 18.85900, 99.25400, true, now(), null, 390, 72, 18, '2026-09-25T08:00:00.000Z', now() + interval '90 days', '2026-09-25T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;
with p as (
  insert into public.properties (owner_id, agent_id, pod_id, zone_id, listing_type, category, status, title, description, sale_price, rent_price, usable_area_sqm, land_area_sqwa, bedrooms, bathrooms, floor, direction, furnishing, maintenance_fee, land_details, tags, province, district, address_line, lat, lng, is_verified, verified_at, featured_until, views_count, saves_count, inquiries_count, published_at, expires_at, created_at)
  values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', null, (select id from public.zones where slug = 'land'), 'sale', 'land', 'active', 'ที่ดินเพื่อการลงทุน 3 ไร่ บางเสร่ ชลบุรี ใกล้ชายหาดและมอเตอร์เวย์ พัทยา-มาบตาพุด', null, 16500000, null, null, 1200, null, null, null, null, null, null, '{"rai":3,"ngan":0,"sq_wa":0,"deed_type":"โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)","road_frontage_m":55,"road_type":"ถนนคอนกรีตสาธารณะ 8 ม.","shape":"สี่เหลี่ยมสวย","utilities":["ไฟฟ้า 3 เฟส","น้ำประปา","ท่อระบายน้ำ"],"suitable_for":["สร้างพูลวิลล่าโครงการ","รีสอร์ท","ลงทุนระยะยาว"],"price_per_sqwa":13750}', array['ที่ดินชลบุรี', 'บางเสร่', 'ใกล้ทะเล', 'EEC', 'โฉนดครุฑแดง']::text[], 'ชลบุรี', 'สัตหีบ', 'บางเสร่-สัตหีบ · ชลบุรี', 12.75300, 100.91500, true, now(), null, 420, 88, 24, '2026-09-26T08:00:00.000Z', now() + interval '90 days', '2026-09-26T08:00:00.000Z')
  returning id
), m as (
  insert into public.property_media (property_id, kind, external_url, sort_order) select id, 'image', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', 0 from p
)
insert into public.commission_programs (property_id, sale_rate_pct, rent_month1_rate_pct, rent_month2_rate_pct, rent_month3_plus_rate_pct, renewal_rate_pct) select id, 3, 100, 50, 25, 25 from p;

-- A live hub (campaign) and upcoming activities
insert into public.hubs (slug, name, theme, description, zone_id, status, starts_at, ends_at)
values ('salaya-move-in-2026', 'Salaya Move-in Festival', 'ฤดูเปิดเทอม', 'รวมคอนโดและบ้านเช่าใกล้ ม.มหิดล ราคาพิเศษ',
        (select id from public.zones where slug = 'near-mahidol'), 'live', now() - interval '3 days', now() + interval '14 days');
insert into public.hub_properties (hub_id, property_id)
select h.id, p.id from public.hubs h, public.properties p
where h.slug = 'salaya-move-in-2026' and p.zone_id = (select id from public.zones where slug = 'near-mahidol');

insert into public.activities (host_id, type, title, description, starts_at, seats, status, hub_id) values
  ('00000000-0000-4000-a000-000000000004', 'live_tour', 'Live Video Tour — Aspire Salaya', 'ทัวร์ห้องจริงผ่านวิดีโอ ถามตอบสด', now() + interval '1 day', 50, 'published', (select id from public.hubs where slug = 'salaya-move-in-2026')),
  ('00000000-0000-4000-a000-000000000004', 'live_qa', 'Ask the Owner Live Q&A', 'คุยตรงกับเจ้าของทรัพย์', now() + interval '3 days', 30, 'published', null),
  (null, 'workshop', 'Land & Condo Buying Consultation', 'เวิร์กช็อปซื้อที่ดินและคอนโดครั้งแรก', now() + interval '7 days', 40, 'published', null);

insert into public.app_settings (key, value) values
  ('listing_duration_days', '90'),
  ('consent_versions', '{"terms":"2026-10-01","privacy":"2026-10-01","marketing":"2026-10-01"}'),
  ('support_contact', '{"line_oa":"@dwelly","email":"support@dwelly.co"}');

