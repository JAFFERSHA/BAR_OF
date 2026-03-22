"use server";

import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notifier';
import { requireUser } from '@/lib/session';
import { saleSchema } from '@/lib/validation';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { sendBillEmail, sendBillSMS } from '@/lib/notify-customer';

export async function createSale(_prev: unknown, formData: FormData): Promise<{ saleId: string } | { error: string }> {
  const user = await requireUser();
  const rawItems = formData.get('items');
  const parsed = saleSchema.safeParse({
    customer: formData.get('customer'),
    customerPhone: formData.get('customerPhone') || '',
    customerEmail: formData.get('customerEmail') || '',
    taxRate: formData.get('taxRate'),
    items: typeof rawItems === 'string' ? JSON.parse(rawItems) : []
  });

  if (!parsed.success) return { error: 'Please add at least one valid line item.' };

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * parsed.data.taxRate;
  const total = subtotal + tax;

  const [currency, barNameRow] = await Promise.all([
    getCurrencySymbol(),
    prisma.setting.findUnique({ where: { key: 'barName' } }),
  ]);
  const barName = barNameRow?.value ?? 'Bar Ops';

  // Fetch product names for the bill
  const productIds = parsed.data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  let saleId: string | null = null;
  const lowStockMessages: { message: string; productId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customer: parsed.data.customer,
        customerPhone: parsed.data.customerPhone || null,
        customerEmail: parsed.data.customerEmail || null,
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
    // Internal notification
    await notify(
      NotificationType.SALE_BILL,
      `Bill ${saleId} for ${parsed.data.customer} — ${formatMoney(total, currency)}`,
      undefined
    );

    // Build bill details for external notification
    const billDetails = {
      saleId,
      customer: parsed.data.customer,
      barName,
      items: parsed.data.items.map((i) => ({
        name: productMap[i.productId] ?? 'Product',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      subtotal,
      tax,
      total,
      currency,
      billedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    // Send email if provided
    if (parsed.data.customerEmail) {
      try {
        await sendBillEmail(parsed.data.customerEmail, billDetails);
      } catch (err) {
        console.error('Email send failed:', err);
      }
    }

    // Send SMS if provided
    if (parsed.data.customerPhone) {
      try {
        await sendBillSMS(parsed.data.customerPhone, billDetails);
      } catch (err) {
        console.error('SMS send failed:', err);
      }
    }
  }

  revalidatePath('/sales');
  revalidatePath('/stock');

  if (!saleId) return { error: 'Sale could not be created.' };
  return { saleId };
}
