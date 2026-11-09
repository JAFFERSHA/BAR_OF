"use server";

import { authenticate } from '@/lib/auth';
import { destroySession } from '@/lib/session';
import { loginSchema } from '@/lib/validation';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getClientIp, rateLimit, tooManyMessage } from '@/lib/rate-limit';

export async function login(_prevState: string | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return 'Invalid credentials';
  }

  // Brute-force protection: per IP, and per identifier+IP
  const ip = getClientIp(await headers());
  const identifier = String(parsed.data.identifier).trim().toLowerCase();
  const byIp = await rateLimit(`login:ip:${ip}`, 30, 15 * 60);
  const byId = await rateLimit(`login:${identifier}:${ip}`, 8, 15 * 60);
  if (!byIp.ok || !byId.ok) {
    return tooManyMessage(Math.max(byIp.retryAfterSec, byId.retryAfterSec));
  }

  const user = await authenticate(parsed.data.identifier, parsed.data.password);
  if (!user) {
    return 'Incorrect email/phone or password';
  }
  redirect('/dashboard');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
