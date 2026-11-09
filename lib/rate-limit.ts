import { prisma } from './prisma';

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/** Client IP as set by Vercel's proxy (first x-forwarded-for entry). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}

/** "Too many attempts. Please try again in 3 minutes." */
export function tooManyMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/**
 * Fixed-window counter stored in Postgres (free — no extra service).
 * Counts this call, then returns ok=false once more than `limit` calls happened in `windowSec`.
 * Fails open: if the database call errors, the request is allowed (and the error is logged).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<{ count: number; retryAfter: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, timezone('utc', now()) + make_interval(secs => ${windowSec}::int))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < timezone('utc', now())
                       THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < timezone('utc', now())
                         THEN timezone('utc', now()) + make_interval(secs => ${windowSec}::int)
                         ELSE "RateLimit"."resetAt" END
      RETURNING "count",
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - timezone('utc', now())))))::int AS "retryAfter"`;

    // Occasionally drop counters that expired more than a day ago.
    if (Math.random() < 0.02) {
      prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < timezone('utc', now()) - interval '1 day'`.catch(
        () => {}
      );
    }

    const row = rows[0];
    return { ok: row.count <= limit, retryAfterSec: row.retryAfter };
  } catch (error) {
    console.error('Rate limiter failed (allowing request):', error);
    return { ok: true, retryAfterSec: 0 };
  }
}
