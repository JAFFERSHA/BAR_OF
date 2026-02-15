"use server";

import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notifier';
import { requireUser } from '@/lib/session';
import { purchaseSchema } from '@/lib/validation';
import { NotificationType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createPurchase(_prev: string | null, formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) return 'Access denied.';
  const itemsPayload = formData.get('items');
  const supplierId = formData.get('supplierId');

  const parsed = purchaseSchema.safeParse({
    supplierId,
    items: typeof itemsPayload === 'string' ? JSON.parse(itemsPayload) : []
  });

  if (!parsed.success) return 'Please add at least one line item.';

  const total = parsed.data.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);

  let purchaseId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: parsed.data.supplierId,
        userId: user.id,
        total,
        items: {
          create: parsed.data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            costPrice: i.costPrice
          }))
        }
      }
    });

    purchaseId = purchase.id;

    for (const item of parsed.data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity }, costPrice: item.costPrice }
      });
    }
  });

  if (purchaseId) {
    await notify(
      NotificationType.PURCHASE_LOGGED,
      `Purchase ${purchaseId} logged for ${parsed.data.items.length} items`,
      undefined
    );
  }

  revalidatePath('/purchase');
  revalidatePath('/stock');
  return null;
}
