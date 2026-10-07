# Dwelly Property — notes for Claude

Real-estate platform (Thai UI). Stack: Next.js 16 + MySQL 8 (Drizzle) + Better Auth, all in `web/`. See README.md and docs/DB-SCHEMA.md.

- `design/public/dwelly.min.html` is a 1 MB minified prototype — never Read it whole; grep for specifics. Its extracted spec is in `docs/`.
- Next.js 16: middleware is `src/proxy.ts` (export `proxy`, cookie check only), request APIs are async, Cache Components OFF; `(site)` and `admin` layouts force dynamic rendering. Read `web/AGENTS.md`.
- **MySQL has no RLS: all authorisation lives in `src/server/services/*`.** Pages and server actions must call services, never write tables directly. Services take an `Actor`, call `requireActive`/`isStaff`, enforce state machines, and write `audit()`/`notify()` in the same transaction. Throw `AppError` with a Thai message for rule violations.
- Server actions: validate with zod, then `attempt(() => service(...), "msg")` → `ActionResult`; used via `ActionForm` (onSubmit-based so inputs survive validation errors). Don't `redirect()` from an action to a route handler.
- Schema change: edit `src/server/db/schema.ts` → `npm run db:generate` → add a case in `tests/services.test.ts` → update `src/lib/types.ts`.
- Uploads: browser → `POST /api/upload` → path `{uid}/{scope}/…` → server action attaches after an ownership check. Private files are served by `/files/[bucket]/…` with per-request checks.
- Before committing: `npm run typecheck && npm run lint && npm test` (in `web/`).
