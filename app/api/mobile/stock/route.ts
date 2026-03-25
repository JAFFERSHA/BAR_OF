import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { notify } from '@/lib/notifier';
import { productSchema } from '@/lib/validation';
import { getCurrencySymbol } from '@/lib/currency';
import { NotificationType, Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [products, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
    getCurrencySymbol()
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice)
    })),
    currency
  });
}

export async function POST(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const product = await prisma.product.create({ data: parsed.data });

  if (parsed.data.quantity <= parsed.data.reorderLevel) {
    await notify(NotificationType.STOCK_LOW, `${parsed.data.name} is already below reorder level`, undefined);
  }

  return NextResponse.json({ product: { ...product, costPrice: Number(product.costPrice), salePrice: Number(product.salePrice) } }, { status: 201 });
}
