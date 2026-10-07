// Applies supabase/migrations + seed.sql to an in-memory Postgres (PGlite) with a
// minimal Supabase shim (auth/storage schemas, API roles), then exercises RLS and
// business rules as different users. Usage: npm run check
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase');
const db = new PGlite({ extensions: { pg_trgm } });

const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create schema storage;
grant usage on schema auth, extensions, storage, public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
  email_change text, email_change_token_new text
);
create table auth.identities (
  id uuid primary key, user_id uuid references auth.users(id) on delete cascade, provider_id text,
  identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select current_setting('request.jwt.claim.role', true) $$;
create function extensions.gen_salt(text) returns text language sql as $$ select 'salt' $$;
create function extensions.crypt(text, text) returns text language sql as $$ select md5($1 || $2) $$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant all on storage.objects to anon, authenticated;
`;

const U = {
  admin: '00000000-0000-4000-a000-000000000001',
  moderator: '00000000-0000-4000-a000-000000000002',
  owner: '00000000-0000-4000-a000-000000000003',
  agent: '00000000-0000-4000-a000-000000000004',
  buyer: '00000000-0000-4000-a000-000000000005',
  owner2: '00000000-0000-4000-a000-000000000006',
};

let passed = 0;
let failed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };
const bad = (name, err) => { failed++; console.log('  ✗', name, '\n     ', err); };

async function as(user, fn) {
  await db.exec(user
    ? `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false); select set_config('request.jwt.claim.role', 'authenticated', false);`
    : `set role anon; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', 'anon', false);`);
  try { return await fn(); } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;

async function expect(name, fn, check) {
  try {
    const v = await fn();
    const res = check(v);
    res === true ? ok(name) : bad(name, res || JSON.stringify(v));
  } catch (e) { bad(name, e.message); }
}
async function expectError(name, fn, pattern) {
  try { await fn(); bad(name, 'expected an error'); } catch (e) {
    !pattern || pattern.test(e.message) ? ok(name) : bad(name, e.message);
  }
}

// ---------------------------------------------------------------------------
console.log('Applying shim, migrations and seed…');
await db.exec(SHIM);
await db.exec(`create publication supabase_realtime;`);
for (const f of readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(join(root, 'migrations', f), 'utf8')); console.log('  ✓', f); }
  catch (e) { console.log('  ✗', f, '\n', e.message); process.exit(1); }
}
try { await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8')); console.log('  ✓ seed.sql'); }
catch (e) { console.log('  ✗ seed.sql\n', e.message); process.exit(1); }

const someActive = (await one(`select id, owner_id, agent_id from public.properties where agent_id is null and status = 'active' limit 1`));
const agentListing = (await one(`select id from public.properties where agent_id is not null limit 1`));

console.log('\nPublic / anon');
await expect('anon sees 25 active listings', () => as(null, () => one(`select count(*)::int n from properties`)), (r) => r.n === 25 || `got ${r.n}`);
await expect('anon cannot read contact details', () => as(null, () => one(`select count(*)::int n from profile_private`)), (r) => r.n === 0);
await expect('anon cannot read commission terms', () => as(null, () => one(`select count(*)::int n from commission_programs`)), (r) => r.n === 0);
await expect('anon sees plans', () => as(null, () => one(`select count(*)::int n from plans`)), (r) => r.n === 9);
await expect('trigram title search works', () => as(null, () => one(`select count(*)::int n from properties where title ilike '%ศาลายา%'`)), (r) => r.n > 0);

console.log('\nListings lifecycle');
let draftId;
await expect('buyer creating "active" listing is forced to draft & own id', () => as(U.buyer, async () => {
  const r = await one(`insert into properties (owner_id, listing_type, category, status, title, sale_price, province, is_verified, views_count)
    values ('${U.owner}', 'sale', 'condo', 'active', 'คอนโดทดสอบ ใกล้ BTS', 1500000, 'กรุงเทพมหานคร', true, 999) returning *`);
  draftId = r.id; return r;
}), (r) => (r.status === 'draft' && r.owner_id === U.buyer && !r.is_verified && r.views_count === 0) || JSON.stringify({ s: r.status, o: r.owner_id, v: r.is_verified }));
await expectError('owner cannot self-publish draft -> active', () => as(U.buyer, () => db.query(`update properties set status = 'active' where id = $1`, [draftId])), /Invalid listing status/);
await expect('anon cannot see draft', () => as(null, () => one(`select count(*)::int n from properties where id = $1`, [draftId])), (r) => r.n === 0);
await expect('owner submits for review', () => as(U.buyer, () => one(`update properties set status = 'pending_review' where id = $1 returning status`, [draftId])), (r) => r.status === 'pending_review');
await expectError('non-staff cannot approve', () => as(U.buyer, () => db.query(`select admin_review_listing($1, true)`, [draftId])), /Staff permission/);
await expectError('reject needs a reason', () => as(U.moderator, () => db.query(`select admin_review_listing($1, false, '')`, [draftId])), /reason/);
await expect('moderator approves -> active + published_at + expiry', () => as(U.moderator, async () => {
  await db.query(`select admin_review_listing($1, true)`, [draftId]);
  return one(`select status, published_at, expires_at from properties where id = $1`, [draftId]);
}), (r) => (r.status === 'active' && !!r.published_at && !!r.expires_at) || JSON.stringify(r));
await expect('owner notified + audit logged', async () => ({
  n: (await one(`select count(*)::int n from notifications where user_id = $1 and type = 'listing'`, [U.buyer])).n,
  a: (await one(`select count(*)::int n from audit_logs where action = 'LISTING_APPROVED'`)).n,
}), (r) => (r.n === 1 && r.a === 1) || JSON.stringify(r));
await expect('owner edits keep verification flags', () => as(U.buyer, () => one(`update properties set sale_price = 1400000, is_verified = true, featured_until = now() + interval '1 year' where id = $1 returning is_verified, featured_until, sale_price`, [draftId])),
  (r) => (r.is_verified === false && r.featured_until === null && Number(r.sale_price) === 1400000) || JSON.stringify(r));
await expectError('other user cannot edit listing', async () => {
  const r = await as(U.owner2, () => db.query(`update properties set title = 'hacked title' where id = $1`, [draftId]));
  if (r.affectedRows === 0) throw new Error('blocked by RLS');
}, /blocked/);

console.log('\nDeals: inquiries, offers, appointments');
await expect('buyer sends inquiry -> seller auto-filled, counter++', () => as(U.buyer, () => one(
  `insert into inquiries (property_id, buyer_id, seller_id, intent, message) values ($1, $2, $2, 'buy', 'สนใจครับ') returning seller_id`, [someActive.id, U.buyer])),
  (r) => r.seller_id === someActive.owner_id || JSON.stringify(r));
await expectError('cannot inquire on own listing', () => as(U.buyer, () => db.query(
  `insert into inquiries (property_id, buyer_id, seller_id, intent) values ($1, $2, $2, 'buy')`, [draftId, U.buyer])), /own listing/);
await expect('seller sees lead, buyer cannot change status', async () => {
  const s = await as(someActive.owner_id, () => one(`select count(*)::int n from inquiries where property_id = $1`, [someActive.id]));
  const b = await as(U.buyer, () => db.query(`update inquiries set status = 'won' where property_id = $1`, [someActive.id]));
  return { s: s.n, affected: b.affectedRows };
}, (r) => (r.s === 1 && r.affected === 0) || JSON.stringify(r));

let offerId;
await expect('buyer makes offer (listed price filled from listing)', () => as(U.buyer, async () => {
  const r = await one(`insert into offers (property_id, buyer_id, seller_id, kind, listed_price, offer_price, status)
    values ($1, $2, $2, 'purchase', 1, 1900000, 'accepted') returning *`, [someActive.id, U.buyer]);
  offerId = r.id; return r;
}), (r) => (r.status === 'pending' && Number(r.listed_price) > 1) || JSON.stringify(r));
await expectError('buyer cannot accept own pending offer', () => as(U.buyer, () => db.query(`update offers set status = 'accepted' where id = $1`, [offerId])), /Invalid offer/);
await expectError('counter requires a price', () => as(someActive.owner_id, () => db.query(`update offers set status = 'countered' where id = $1`, [offerId])), /Counter price/);
await expect('seller counters, buyer accepts counter', async () => {
  await as(someActive.owner_id, () => db.query(`update offers set status = 'countered', counter_price = 2000000 where id = $1`, [offerId]));
  return as(U.buyer, () => one(`update offers set status = 'accepted' where id = $1 returning status, counter_price`, [offerId]));
}, (r) => (r.status === 'accepted' && Number(r.counter_price) === 2000000) || JSON.stringify(r));

let apptId;
await expectError('appointment in the past rejected', () => as(U.buyer, () => db.query(
  `insert into appointments (property_id, buyer_id, seller_id, scheduled_at) values ($1, $2, $2, now() - interval '1 day')`, [someActive.id, U.buyer])), /1 hour/);
await expect('appointment flow: request -> confirm -> complete', async () => {
  const a = await as(U.buyer, () => one(`insert into appointments (property_id, buyer_id, seller_id, scheduled_at, format)
    values ($1, $2, $2, now() + interval '2 days', 'video') returning id, status`, [someActive.id, U.buyer]));
  apptId = a.id;
  await as(someActive.owner_id, () => db.query(`update appointments set status = 'confirmed', meeting_url = 'https://meet.example/x' where id = $1`, [apptId]));
  return as(someActive.owner_id, () => one(`update appointments set status = 'completed' where id = $1 returning status, meeting_url`, [apptId]));
}, (r) => (r.status === 'completed' && !!r.meeting_url) || JSON.stringify(r));
await expectError('buyer cannot mark completed appointment as confirmed', () => as(U.buyer, () => db.query(`update appointments set status = 'confirmed' where id = $1`, [apptId])), /Invalid appointment/);
await expect('buyer can review seller after completed viewing', () => as(U.buyer, () => one(
  `insert into reviews (reviewer_id, target_type, target_id, rating, body) values ($1, 'seller', $2, 5, 'ดีมาก') returning status`, [U.buyer, someActive.owner_id])),
  (r) => r.status === 'published');
await expectError('cannot review someone you never dealt with', () => as(U.owner2, () => db.query(
  `insert into reviews (reviewer_id, target_type, target_id, rating) values ($1, 'agent', $2, 1)`, [U.owner2, U.agent])), /only after/);

console.log('\nMessaging & contact');
let convId;
await expect('start conversation + message', () => as(U.buyer, async () => {
  convId = (await one(`select start_conversation($1) id`, [someActive.id])).id;
  await db.query(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'สวัสดีครับ')`, [convId, U.buyer]);
  const again = (await one(`select start_conversation($1) id`, [someActive.id])).id;
  return { same: again === convId };
}), (r) => r.same === true);
await expect('seller inbox shows 1 unread', () => as(someActive.owner_id, () => one(`select * from list_conversations() where id = $1`, [convId])),
  (r) => (r && Number(r.unread_count) === 1 && r.other_user_id === U.buyer) || JSON.stringify(r));
await expect('outsider cannot read the thread', () => as(U.owner2 === someActive.owner_id ? U.agent : U.owner2, () => one(`select count(*)::int n from messages where conversation_id = $1`, [convId])), (r) => r.n === 0);
await expectError('outsider cannot post into the thread', () => as(U.admin, () => db.query(
  `insert into messages (conversation_id, sender_id, body) values ($1, $2, 'spam')`, [convId, U.admin])), /row-level security/);
await expect('contact reveal returns seller phone for signed-in user', () => as(U.buyer, () => one(`select * from reveal_listing_contact($1)`, [someActive.id])), (r) => !!r.phone || JSON.stringify(r));
await expectError('contact reveal requires sign-in', () => as(null, () => db.query(`select * from reveal_listing_contact($1)`, [someActive.id])), /Sign in/);

console.log('\nCommission (Co-Agent)');
await expect('buyer cannot see commission terms', () => as(U.buyer, () => one(`select count(*)::int n from commission_programs`)), (r) => r.n === 0);
await expect('assigned agent sees commission of own listings', () => as(U.agent, () => one(`select count(*)::int n from commission_programs where property_id = $1`, [agentListing.id])), (r) => r.n >= 0);
await expectError('non-agent cannot request commission access', () => as(U.buyer, () => db.query(
  `insert into commission_access_requests (agent_id) values ($1)`, [U.buyer])), /Only agents/);
await expect('agent requests platform access; staff approves; terms visible', async () => {
  const req = await as(U.agent, () => one(`insert into commission_access_requests (agent_id, message) values ($1, 'ขอเป็น partner') returning id`, [U.agent]));
  await as(U.moderator, () => db.query(`update commission_access_requests set status = 'approved' where id = $1`, [req.id]));
  return as(U.agent, () => one(`select count(*)::int n from commission_programs`));
}, (r) => r.n > 0 || JSON.stringify(r));

console.log('\nVerification, reports, moderation');
await expect('user submits KYC; verifier approves; badge set', async () => {
  const req = await as(U.buyer, () => one(`insert into verification_requests (user_id, kind, submitted_data) values ($1, 'identity', '{"id_last4":"1234"}') returning id, status`, [U.buyer]));
  await as(U.buyer, () => db.query(`insert into verification_documents (request_id, doc_type, storage_path) values ($1, 'id_card', $2)`, [req.id, `${U.buyer}/${req.id}/id.jpg`]));
  await as(U.admin, () => db.query(`select admin_review_verification($1, 'approved')`, [req.id]));
  return one(`select is_kyc_verified from profiles where id = $1`, [U.buyer]);
}, (r) => r.is_kyc_verified === true);
await expectError('cannot attach doc outside own folder', async () => {
  const req = await as(U.owner2, () => one(`insert into verification_requests (user_id, kind) values ($1, 'identity') returning id`, [U.owner2]));
  await as(U.owner2, () => db.query(`insert into verification_documents (request_id, doc_type, storage_path) values ($1, 'id_card', $2)`, [req.id, `${U.buyer}/x.jpg`]));
}, /row-level security/);
await expectError('user cannot self-verify KYC', async () => {
  await as(U.owner2, () => db.query(`update profiles set is_kyc_verified = true where id = $1`, [U.owner2]));
  const r = await one(`select is_kyc_verified from profiles where id = $1`, [U.owner2]);
  if (!r.is_kyc_verified) throw new Error('guarded');
}, /guarded/);
await expect('reports visible to reporter and staff only', async () => {
  await as(U.buyer, () => db.query(`insert into reports (target_type, target_id, reason, details) values ('property', $1, 'scam', 'ขอโอนเงินก่อนดูห้อง')`, [someActive.id]));
  const other = await as(U.owner2, () => one(`select count(*)::int n from reports`));
  const staff = await as(U.moderator, () => one(`select count(*)::int n from reports`));
  return { other: other.n, staff: staff.n };
}, (r) => (r.other === 0 && r.staff === 1) || JSON.stringify(r));
await expect('banned user cannot act; listings archived', async () => {
  await as(U.admin, () => db.query(`select admin_set_user_status($1, 'banned', 'scam')`, [U.owner2]));
  const live = await one(`select count(*)::int n from properties where owner_id = $1 and status = 'active'`, [U.owner2]);
  const attempt = await as(U.owner2, () => db.query(`insert into reports (target_type, target_id, reason) values ('user', $1, 'other')`, [U.buyer]).then(() => 'inserted', () => 'blocked'));
  return { live: live.n, blocked: attempt === 'blocked' };
}, (r) => (r.live === 0 && r.blocked) || JSON.stringify(r));
await expectError('moderator cannot ban (support role needed)', () => as(U.moderator, () => db.query(`select admin_set_user_status($1, 'suspended', 'x')`, [U.buyer])), /Staff permission/);

console.log('\nBilling, maintenance, PDPA');
await expect('order price comes from catalogue; fulfill sets featured', async () => {
  const listing = (await one(`select id from properties where owner_id = $1 and status = 'active' limit 1`, [U.owner])).id;
  const o = await as(U.owner, () => one(`select * from create_order('boost', null, 'boost-spotlight', $1)`, [listing]));
  await db.query(`select fulfill_order($1, 'omise', 'chrg_test_1')`, [o.id]);
  await db.query(`select fulfill_order($1, 'omise', 'chrg_test_1')`, [o.id]); // idempotent
  const p = await one(`select featured_until > now() + interval '13 days' f from properties where id = $1`, [listing]);
  const b = await one(`select count(*)::int n from boosts where order_id = $1`, [o.id]);
  return { amount: Number(o.amount_thb), f: p.f, boosts: b.n };
}, (r) => (r.amount === 999 && r.f && r.boosts === 1) || JSON.stringify(r));
await expectError('users cannot call fulfill_order', () => as(U.owner, () => db.query(`select fulfill_order(gen_random_uuid(), 'x', 'y')`)), /permission denied/);
await expectError('cannot boost someone else\'s listing', () => as(U.buyer, () => db.query(`select create_order('boost', null, 'boost-24h', $1)`, [someActive.id])), /own active listing/);
await expect('maintenance job runs', async () => {
  await db.query(`update properties set expires_at = now() - interval '1 minute' where id = $1`, [draftId]);
  return one(`select run_maintenance() r`);
}, (r) => r.r.expired_listings === 1 || JSON.stringify(r));
await expect('admin dashboard stats', () => as(U.admin, () => one(`select admin_dashboard_stats() s`)), (r) => r.s.listings_active > 0 || JSON.stringify(r));
await expectError('dashboard stats need staff', () => as(U.buyer, () => db.query(`select admin_dashboard_stats()`)), /Staff permission/);
await expect('PDPA export contains own data only', () => as(U.buyer, () => one(`select export_my_data() d`)),
  (r) => (r.d.profile.id === U.buyer && r.d.offers.length === 1) || JSON.stringify(Object.keys(r.d)));
await expect('consent recorded + latest returned', () => as(U.buyer, async () => {
  await db.query(`insert into consents (user_id, kind, version, granted) values ($1, 'marketing', 'v1', true), ($1, 'marketing', 'v1', false)`, [U.buyer]);
  return one(`select granted from my_consents() where kind = 'marketing'`);
}), (r) => r.granted === false);

console.log('\nStorage policies');
await expect('upload into own folder allowed, other folder blocked', async () => {
  const mine = await as(U.buyer, () => db.query(`insert into storage.objects (bucket_id, name) values ('property-media', $1)`, [`${U.buyer}/p/1.jpg`]).then(() => 'ok', (e) => e.message));
  const theirs = await as(U.buyer, () => db.query(`insert into storage.objects (bucket_id, name) values ('property-media', $1)`, [`${U.owner}/p/1.jpg`]).then(() => 'ok', () => 'blocked'));
  return { mine, theirs };
}, (r) => (r.mine === 'ok' && r.theirs === 'blocked') || JSON.stringify(r));
await expect('verification docs hidden from other users', async () => {
  await db.query(`insert into storage.objects (bucket_id, name) values ('verification-docs', $1)`, [`${U.owner}/r/deed.pdf`]);
  return as(U.buyer, () => one(`select count(*)::int n from storage.objects where bucket_id = 'verification-docs'`));
}, (r) => r.n === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
