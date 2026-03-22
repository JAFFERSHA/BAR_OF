"use server";

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function resetPassword(formData: FormData): Promise<{ error?: string; success?: string }> {
  const token = (formData.get('token') as string)?.trim();
  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!token) return { error: 'Invalid reset link.' };
  if (!password || password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return { error: 'Invalid or already used reset link.' };
  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return { error: 'This reset link has expired. Please request a new one.' };
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) return { error: 'User not found.' };

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return { success: 'Password updated successfully. You can now sign in.' };
}
