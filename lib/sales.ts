import { NotificationType } from '@prisma/client';
import { z } from 'zod';
import { notify } from './notifier';
import { prisma } from './prisma';
import { saleSchema } from './validation';

export type SaleInput = z.infer<typeof saleSchema>;

/** A sale that cannot be recorded (unknown product, not enough stock). Safe to show to the user. */
export class SaleError extends Error {}

/**
 * Records a sale and decrements stock in one transaction.
 *
 * Stock can never go negative: each decrement only matches while enough units remain
 * (`quantity >= requested`), so two sales racing for the last units cannot both succeed.
 */
export async function recordSale(userId: string, input: SaleInput) {
  const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * input.taxRate;
  const total = subtotal + tax;
  const lowStock: { message: string; productId: string }[] = [];

  const saleId = await prisma.$transaction(async (tx) => {
    // Check/decrement stock first, so an unknown product or a shortage gives a clear
    // message instead of a database foreign-key error. Any throw rolls everything back.
    for (const item of input.items) {
      const { count } = await tx.product.updateMany({
        where: { id: item.productId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } }
      });

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new SaleError('One of the products no longer exists.');
      if (count === 0) {
        throw new SaleError(`Not enough stock for ${product.name} (only ${product.quantity} left).`);
      }

      if (product.quantity <= product.reorderLevel) {
        lowStock.push({
          message: `${product.name} fell below reorder level (${product.quantity}/${product.reorderLevel})`,
          productId: product.id
        });
      }
    }

    const sale = await tx.sale.create({
      data: {
        customer: input.customer,
        subtotal,
        tax,
        total,
        userId,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          }))
        }
      }
    });

    return sale.id;
  });

  for (const msg of lowStock) {
    await notify(NotificationType.STOCK_LOW, msg.message, msg.productId);
  }
  await notify(
    NotificationType.SALE_BILL,
    `Bill ${saleId} issued for ${input.customer} - ${total.toFixed(2)}`,
    undefined
  );

  return { saleId, subtotal, tax, total };
}
