import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { notify } from '@/lib/notifier';
import { saleSchema } from '@/lib/validation';
import { NotificationType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } }
    }
  });

  return NextResponse.json({
    sales: sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      total: Number(s.total),
      items: s.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) }))
    }))
  });
}

export async function POST(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

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

  for (const msg of lowStockMessages) {
    await notify(NotificationType.STOCK_LOW, msg.message, msg.productId);
  }

  if (saleId) {
    await notify(
      NotificationType.SALE_BILL,
      `Bill ${saleId} issued for ${parsed.data.customer} - ${total.toFixed(2)}`,
      undefined
    );
  }

  return NextResponse.json({ success: true, saleId, subtotal, tax, total }, { status: 201 });
}
