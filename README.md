# Bar Inventory & Billing (Next.js + Postgres)

A compact bar-operations web app: login with email/phone, manage stock, log purchases, generate customer bills, and notify managers/owners when stock is low or transactions occur.

## Stack
- Next.js 16 (App Router, Server Actions)
- Postgres via Prisma ORM
- JWT cookie auth (email/phone + password)
- TypeScript, Zod validation

## Getting started
1) Install dependencies  
   ```bash
   npm install
   ```
2) Create a `.env` from `.env.example` and point `DATABASE_URL` to Postgres.  
   Set `AUTH_SECRET` to a long random string (e.g., `openssl rand -hex 32`).
3) Run migrations and seed demo data  
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```
4) Start dev server  
   ```bash
   npm run dev
   ```
5) Sign in with demo users:  
   - owner@bar.test / Passw0rd!  
   - manager@bar.test / Passw0rd!  
   - staff@bar.test / Passw0rd!

## Features
- **Auth**: Login via email or phone + password; JWT httpOnly cookie.
- **Dashboard**: Low-stock watchlist and daily sales/purchase totals.
- **Stock**: CRUD create SKUs, set reorder levels, live counts.
- **Purchases**: Log intake, update inventory, notify manager/owner.
- **Sales/Billing**: Build customer bills, auto-deduct stock, notify when items drop below reorder.
- **Notifications**: Stored per manager/owner; replace `lib/notifier.ts` with email/SMS hooks.

## Notes
- Server Actions are enabled; ensure Next.js 16+.
- Replace the placeholder notifier with real email/SMS (SendGrid/Twilio) for production.
- Run `npm run prisma:generate` after editing `prisma/schema.prisma`.
