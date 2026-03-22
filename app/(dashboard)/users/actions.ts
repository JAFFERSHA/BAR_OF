"use server";

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
  password: z.string().min(6),
});

export async function createUser(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER) return;

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || '',
    phone: formData.get('phone') || undefined,
    role: formData.get('role'),
    password: formData.get('password'),
  });
  if (!parsed.success) return;

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      password: hashed,
    }
  });
  revalidatePath('/users');
  redirect('/users?toast=Team member added successfully');
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireUser();
  if (currentUser.role !== Role.OWNER) return;
  const id = formData.get('id') as string;
  if (!id || id === currentUser.id) return;
  await prisma.user.delete({ where: { id } });
  revalidatePath('/users');
  redirect('/users?toast=Team member removed&type=error');
}
