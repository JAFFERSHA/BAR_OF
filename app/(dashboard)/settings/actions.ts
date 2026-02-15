"use server";

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
}
