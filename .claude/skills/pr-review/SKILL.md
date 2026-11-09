---
name: pr-review
description: Review a GitHub pull request for this project — read the full diff, check Prisma schema changes, run type-check/lint/build gates, run it against the local DB, check regressions, and produce findings with file:line citations plus a ready-to-paste review comment. Read-only; never commits, merges or posts unless asked. Use as /pr-review <PR number or URL>.
---

# pr-review

Input: `$ARGUMENTS` = PR number or URL (optionally `--post`).
Read `CLAUDE.md` (project facts) and `review-reference.md` (same folder: citation format, severity, watchlist, verdict rule) first.

## Step 0 — Detect where you are running
Run: `echo "remote=$CLAUDE_CODE_REMOTE"; ls -d ~/Documents/ZeroToDeploy/_dev 2>/dev/null`
- **LOCAL** = not remote AND `~/Documents/ZeroToDeploy/_dev` exists → write `review.md` + `screenshots/` to
  `~/Documents/ZeroToDeploy/_dev/reports/<repo>/PR-<n>-<yyyy-MM-dd-HHmm>/` (outside every repo).
- **MOBILE/CLOUD** → **no review file, no screenshots**; the full review goes in your final chat message. DB/app-run steps are `SKIPPED (cloud session — no DB)`.

## Hard rules
1. **Read-only.** Never edit, format or "fix" PR code; no `git add/commit/push`, no approve/merge, no deploy.
2. **Never change the user's checked-out branch or working tree** — review in a separate worktree (step 1).
3. Local DB only; never connect to production (Neon / `.env.vercel` / `# CLOUD` URLs).
4. Post to GitHub **only** if `--post` was passed or the user asks in this conversation.
5. Report faithfully — `FAIL` / `SKIPPED (reason)` are written as such.

## Steps

### 0. Fetch the PR
- If `gh` is logged in: `gh pr view <n> --json number,title,body,author,state,baseRefName,headRefName,files,commits,reviews,comments,additions,deletions,statusCheckRollup` and `gh pr diff <n>` (read all of it).
- If `gh` is not available: `git fetch origin pull/<n>/head:pr-<n>` and `git diff origin/main...pr-<n>`; ask the user for the PR description if needed.
- Read existing reviews/comments first — don't repeat them.
- Check other open PRs touching the same files (`gh pr list --state open --json number,title,files`).

### 1. Check out in a separate worktree (LOCAL)
- `git fetch origin pull/<n>/head:pr-<n> --force`
- `git worktree add --detach ../_pr-<n> pr-<n>` → `$WT` (sibling folder, outside the repo).
- Copy `.env` into `$WT` (it is git-ignored, never committed). Run `npm ci` in `$WT` (don't symlink node_modules — Prisma generates into it).
- In cloud: the session already has its own checkout — fetch the PR ref and `git checkout pr-<n>` there.
- Cleanup at the end (LOCAL): `git worktree remove --force ../_pr-<n>` and `git branch -D pr-<n>`; confirm the user's branch and `git status` are unchanged.

### 2. Static review
Against `CLAUDE.md` and the watchlist in `review-reference.md`:
- Correctness, edge cases, error handling, auth + role/ownership checks on every API route touched.
- Validation of request bodies (zod), no secrets or real user data in code/logs.
- Impact sweep: if a model/route changed meaning, are all surfaces in `CLAUDE.md` → "Surfaces" covered (incl. the `mobile/` app, which calls the same API)?
- Every finding cites `path:line` from the PR head and says what / why / how to fix.

### 3. Schema review (if `prisma/schema.prisma` or `prisma/migrations/` changed)
- Apply to the **local** DB in `$WT` with the project's command from `CLAUDE.md`; verify new objects exist.
- New required fields have defaults/backfill; no destructive change to columns holding real data without a safe path.
- Does the PR say what must be run on production? If not, that is a finding.

### 4. Gates (each its own command, read the exit code)
From `CLAUDE.md` → "Gates": `npx tsc --noEmit`, lint (if it works for this repo; compare to the baseline), `npm run build`.
Record `PASS` / `FAIL` / `SKIPPED (reason)` with excerpts. Compare with the PR's CI/Vercel preview status if available.

### 5. Run it (LOCAL only)
- Dev server from `$WT` on a **different port** than the user's (e.g. project port + 100).
- Exercise each changed flow via API and UI as each affected role; synthetic rows only, deleted afterwards.
- Screenshot changed screens into `screenshots/` and embed them in `review.md`.

### 6. Regression check
Smoke flows from `CLAUDE.md` + every surface from step 2: `OK` / `BROKEN` / `N/A` with evidence.

### 7. Verdict
Findings grouped **🔴 Mandatory / 🟡 Major / 🟢 Nice to have** (+ ✅ good things), each with `path:line`, what, why, action.
Open with "What this PR does" and "Process concerns"; end with one Recommendation line (see verdict rule).
Include a **copy-paste block** with the review comment text.
- LOCAL: all of this in `review.md`; tell the user the path and the verdict.
- MOBILE/CLOUD: all of this in the final message.
- Post only with `--post`/explicit ask: write the body to a temp file outside the repo, `gh pr comment <n> --body-file <file>`, verify it posted.
