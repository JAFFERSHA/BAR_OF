# pr-review reference

`CLAUDE.md` at the repo root wins over this file if they disagree.

## Citation format (required for every finding)
`path/to/file.ts:42` or `path/to/file.ts:42-58`, from the PR head (`git show pr-<n>:<path>`).
Every finding answers: **where** (path:line) · **what** (concrete behaviour) · **why** (consequence) · **how** (code-level fix).
Not findings: "consider refactoring", "might cause issues", "something is wrong in X".

## Verification discipline
1. Trace callers (`git grep -n <symbol>`) before flagging a function in isolation.
2. Read the whole function/file, not just the diff hunk.
3. Grep on both `origin/main` and `pr-<n>` before calling something dead or missing.
4. Don't claim a Prisma field/table problem without checking `prisma/schema.prisma` or the local DB.
5. Don't trust the PR description; read the code.
6. Don't repeat earlier reviewers — supplement them.

## Severity
| Question | Yes → |
|---|---|
| A real user hits it in normal use? | 🔴 Mandatory |
| Data loss/corruption, or wrong values silently saved? | 🔴 Mandatory |
| Auth bypass, or a user/role sees or changes data they shouldn't? | 🔴 Mandatory |
| Crash / 500 reachable from a button or screen the UI offers? | 🔴 Mandatory |
| Prisma schema change that breaks existing production rows or needs an unlisted prod step? | 🔴 Mandatory |
| Build or type-check fails? | 🔴 Mandatory |
| Rare edge case, or tech-debt pattern? | 🟡 Major |
| Style/naming/cosmetic, invisible to users? | 🟢 Nice to have |

## Watchlist (Next.js + Prisma + Vercel)
- **API route without an auth check**, or one that trusts a `userId`/role from the request body instead of the session/JWT.
- **Missing ownership check** — fetching/updating by id without `where: { id, userId }` (or role rule from `CLAUDE.md`).
- **No zod validation** on a request body; raw `req.json()` values written to the DB.
- **UI-only guard** — button hidden but the API still allows the action (or the reverse: UI offers an action the API rejects).
- **Secrets / env**: hard-coded keys, `.env` committed, secret used in a `NEXT_PUBLIC_*` variable, server-only code imported into a client component.
- **Prisma**: new required column without default; `deleteMany`/`updateMany` without a tight `where`; N+1 queries in loops; new `PrismaClient()` instead of the shared `lib/prisma`.
- **Dates/time zones**: reminders, schedules or reports computed in server UTC when users are in IST.
- **Cron routes** (`/api/cron/*`) callable without the `CRON_SECRET` check; Vercel Hobby only allows daily crons in `vercel.json`.
- **Mobile app break**: API response shape changed but `mobile/` still expects the old shape.
- **Next.js**: `"use client"` component doing data access; missing loading/error states; `middleware.ts` public-path list widened by mistake.
- **Real user data** in seeds, tests, logs or screenshots.
- **Jargon / raw error text** shown to users.

## Process concerns (one bullet each, only if triggered)
- Empty or misleading PR title/description
- Scope sprawl (more than one distinct change and >300 lines)
- Schema change with no note on the production DB step
- Build / Vercel preview red or not run
- Reformat bundled with a fix, hiding the real change
- Overlap with another open PR touching the same files

## Verdict rule
Ready: zero 🔴 Mandatory, 🟡 Majors agreed, gates PASS (or failures proven pre-existing), regression check has no BROKEN.
Recommendation line: `Ready to merge` · `Approve with optional follow-ups #N–#M` · `Blocked on Mandatory #N, #M`.

## Read-only rule
Never edit, format or fix PR code; no `--fix`/`--write` tools, no `git add/commit/push`. Running type-check, lint, build,
the local DB and the app is allowed and expected; the only writes are to the local DB and to the `_dev` report folder.
