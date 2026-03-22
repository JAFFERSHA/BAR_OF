"use server";

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

export async function createSupplier(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) return;
  const parsed = supplierSchema.safeParse({
    name: formData.get('name'),
    contact: formData.get('contact') || undefined,
    email: formData.get('email') || '',
    phone: formData.get('phone') || undefined,
  });
  if (!parsed.success) return;
  await prisma.supplier.create({ data: parsed.data });
  revalidatePath('/suppliers');
  redirect('/suppliers?toast=Supplier added successfully');
}

export async function deleteSupplier(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER) return;
  const id = formData.get('id') as string;
  if (!id) return;
  await prisma.supplier.delete({ where: { id } });
  revalidatePath('/suppliers');
  redirect('/suppliers?toast=Supplier deleted&type=error');
}
