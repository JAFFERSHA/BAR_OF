"use server";

import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notifier';
import { requireUser } from '@/lib/session';
import { saleSchema } from '@/lib/validation';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createSale(_prev: string | null, formData: FormData) {
  const user = await requireUser();
  const rawItems = formData.get('items');
  const parsed = saleSchema.safeParse({
    customer: formData.get('customer'),
    taxRate: formData.get('taxRate'),
    items: typeof rawItems === 'string' ? JSON.parse(rawItems) : []
  });

  if (!parsed.success) return 'Please add at least one line item.';

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * parsed.data.taxRate;
  const total = subtotal + tax;

  let saleId: string | null = null;
  const lowStockMessages: { message: string; productId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customer: parsed.data.customer,
        subtotal,
        tax,
        total,
        userId: user.id,
        items: {
          create: parsed.data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          }))
        }
      }
    });

    saleId = sale.id;

    for (const item of parsed.data.items) {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } }
      });

      if (product.quantity <= product.reorderLevel) {
        lowStockMessages.push({
          message: `${product.name} fell below reorder level (${product.quantity}/${product.reorderLevel})`,
          productId: product.id
        });
      }
    }
  });

  if (lowStockMessages.length) {
    for (const msg of lowStockMessages) {
      await notify(NotificationType.STOCK_LOW, msg.message, msg.productId);
    }
  }

  if (saleId) {
    await notify(
      NotificationType.SALE_BILL,
      `Bill ${saleId} issued for ${parsed.data.customer} - ${total.toFixed(2)}`,
      undefined
    );
  }

  revalidatePath('/sales');
  revalidatePath('/stock');
  return null;
}
