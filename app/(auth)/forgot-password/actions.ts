"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';

export async function requestPasswordReset(formData: FormData): Promise<{ error?: string; success?: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email) return { error: 'Please enter your email address.' };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user) return { success: 'If that email is registered, a reset link has been sent.' };

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, email, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bar-stock-app.vercel.app';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Bar Ops" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your Bar Ops password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#111;color:#eee;border-radius:12px">
        <h2 style="color:#f59e0b;margin-bottom:8px">🍺 Bar Ops — Password Reset</h2>
        <p>Hello ${user.name},</p>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#f59e0b;color:#000;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
        <p style="font-size:12px;color:#888">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#888">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });

  return { success: 'If that email is registered, a reset link has been sent.' };
}
