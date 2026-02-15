"use server";

import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notifier';
import { requireUser } from '@/lib/session';
import { productSchema } from '@/lib/validation';
import { NotificationType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) return;
  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    sku: formData.get('sku'),
    unit: formData.get('unit'),
    costPrice: formData.get('costPrice'),
    salePrice: formData.get('salePrice'),
    quantity: formData.get('quantity'),
    reorderLevel: formData.get('reorderLevel')
  });

  if (!parsed.success) return;

  await prisma.product.create({ data: parsed.data });
  if (parsed.data.quantity <= parsed.data.reorderLevel) {
    await notify(NotificationType.STOCK_LOW, `${parsed.data.name} is already below reorder level`, undefined);
  }
  revalidatePath('/stock');
}
