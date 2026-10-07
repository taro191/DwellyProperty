# Dwelly Property — notes for Claude

Real-estate platform (Thai UI). See README.md for setup/status and docs/DB-SCHEMA.md for the data model.

- `design/public/dwelly.min.html` is a 1 MB minified prototype — never Read it whole; grep for specifics. Its extracted spec is in `docs/`.
- `web/` is Next.js 16: middleware is `src/proxy.ts` (export `proxy`), request APIs (`cookies`, `params`, `searchParams`) are async, Cache Components are OFF on purpose. Read `web/AGENTS.md`.
- Security lives in the database: RLS + guard triggers + `admin_*` RPCs. Never trust the client for status/verification/price fields; add a guard or RPC instead. Server actions re-check roles only for fast feedback.
- Guard trigger functions must NOT be `security definer` (they rely on `current_user` via `is_privileged_role()`).
- Schema changes: new migration file + case in `tools/db-check/check.mjs` (`npm run check`, must stay green) + update `web/src/lib/types.ts`.
- Server actions return `ActionResult` and are used through `ActionForm` (`components/ui/form.tsx`), which uses onSubmit so React doesn't reset inputs on validation errors. Map DB errors to Thai via `dbError()` in `lib/action-utils.ts`.
- Uploads go browser → Supabase Storage at `{uid}/...`; server actions only record paths.
- Before committing: `cd web && npx tsc --noEmit && npx eslint src`.
