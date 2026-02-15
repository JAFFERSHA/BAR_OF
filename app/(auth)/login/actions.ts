"use server";

import { authenticate } from '@/lib/auth';
import { destroySession } from '@/lib/session';
import { loginSchema } from '@/lib/validation';
import { redirect } from 'next/navigation';

export async function login(_prevState: string | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return 'Invalid credentials';
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
