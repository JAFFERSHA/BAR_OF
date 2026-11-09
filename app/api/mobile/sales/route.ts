import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { recordSale, SaleError } from '@/lib/sales';
import { saleSchema } from '@/lib/validation';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { saleId, subtotal, tax, total } = await recordSale(user.id, parsed.data);
    return NextResponse.json({ success: true, saleId, subtotal, tax, total }, { status: 201 });
  } catch (err) {
    // e.g. "Not enough stock for X (only 3 left)" — the mobile app shows this message.
    if (err instanceof SaleError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
