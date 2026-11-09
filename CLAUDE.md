# BAR_OF (bar-stock-app) — project guide for Claude

Bar stock management: products, suppliers, purchases (stock in), sales (stock out), low-stock notifications, settings.
Staff use it on the web and through an Expo mobile app.

- Live: https://bar-stock-app.vercel.app (Vercel project `bar-stock-app`, auto-deploys on push to `main`)
- Skills: `/implement-ticket`, `/pr-review` (in `.claude/skills/`)

## Stack
- Next.js 16 (App Router) · React 19 · TypeScript · zod
- Prisma 6 (`lib/prisma.ts`), PostgreSQL (`public` schema), **real migrations** in `prisma/migrations/`
- Auth: own JWT (`jose`) — web cookie session in `lib/session.ts` (`getSession`, `requireUser`), mobile bearer token in
  `lib/mobile-session.ts` (`requireMobileUser`), password check in `lib/auth.ts`. Page access rules in `lib/rbac.ts`.
- Notifications: `lib/notifier.ts` (Gmail / Resend / Fast2SMS). Currency formatting: `lib/currency.ts`.
- `mobile/` = separate Expo app calling `/api/mobile/*`. Own `package.json`/`tsconfig.json`; excluded from the web build via root `tsconfig.json`.

## Layout
- `app/(auth)/login` · `app/(dashboard)` dashboard, stock, purchase, sales, notifications, settings
- `app/api/mobile/*` — auth, dashboard, stock, purchase, sales, suppliers, notifications, settings · `app/api/logout`
- Server actions are enabled (`serverActions` experiment) — web pages mutate via server actions, mobile via `/api/mobile`.

## Auth & roles
- Roles: `OWNER`, `MANAGER`, `STAFF` (enum `Role`). Page access (`lib/rbac.ts`):
  dashboard/sales = all three · stock/purchase/notifications = OWNER+MANAGER · settings = OWNER only.
- The same rules must hold on the **server side** (server actions and `/api/mobile/*`), not just in the nav — a hidden link is not a guard.

## Commands & local setup
- Local DB: PostgreSQL `localhost:5432`, DB `bar_of` (pgAdmin "Local PostgreSQL 18"). `.env` points there; production URL only in `# CLOUD` comments / `.env.vercel` — **never use it**.
- Dev server: `npx next dev -p 3003`
- Schema change: edit `prisma/schema.prisma` → `npx prisma migrate dev --name <change>` (local; creates a migration folder that **is committed**) → production step for the owner: `npx prisma migrate deploy`.
- Seed: `prisma/seed.ts`.

## Gates
1. `npx tsc --noEmit` — currently clean
2. Lint — **broken**: `npm run lint` runs `next lint`, which was removed in Next 16. Mark `SKIPPED (next lint removed in Next 16)`; don't fix unasked.
3. `npm run build`
No automated test suite exists.

## Surfaces
Dashboard (stock value, today's sales), stock list, purchase entry (+ suppliers), sales entry, notifications (low stock),
settings (OWNER), login/logout, every matching `/api/mobile/*` route and the `mobile/` app screens.

## Smoke flows
Login as OWNER → add purchase → stock goes up → add sale → stock goes down → low-stock notification → login as STAFF → can only see dashboard + sales.

## Gotchas
- Stock must never go negative from a sale; purchases/sales should update stock in one transaction.
- When changing an `/api/mobile/*` response, check `mobile/` for the code that reads it.
