import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { notify } from '@/lib/notifier';
import { purchaseSchema } from '@/lib/validation';
import { NotificationType, Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      supplier: { select: { name: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } }
    }
  });

  return NextResponse.json({
    purchases: purchases.map((p) => ({
      ...p,
      total: Number(p.total),
      items: p.items.map((i) => ({ ...i, costPrice: Number(i.costPrice) }))
    }))
  });
}

export async function POST(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

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

  return NextResponse.json({ success: true, purchaseId, total }, { status: 201 });
}
