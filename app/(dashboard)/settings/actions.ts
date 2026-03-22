"use server";

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateCurrency(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER) return;
  const symbol = formData.get('currency') as string;
  if (!CURRENCY_OPTIONS.includes(symbol)) return;
  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: { value: symbol },
    create: { key: 'currency', value: symbol },
  });
  revalidatePath('/', 'layout');
  redirect('/settings?toast=Currency updated');
}

export async function updateBarName(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER) return;
  const name = (formData.get('barName') as string)?.trim();
  if (!name || name.length < 2) return;
  await prisma.setting.upsert({
    where: { key: 'barName' },
    update: { value: name },
    create: { key: 'barName', value: name },
  });
  revalidatePath('/', 'layout');
  redirect('/settings?toast=Bar name updated');
}

export async function updateTaxRate(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER) return;
  const rate = parseFloat(formData.get('taxRate') as string);
  if (isNaN(rate) || rate < 0 || rate > 1) return;
  await prisma.setting.upsert({
    where: { key: 'taxRate' },
    update: { value: rate.toString() },
    create: { key: 'taxRate', value: rate.toString() },
  });
  revalidatePath('/', 'layout');
  redirect('/settings?toast=Tax rate updated');
}
