import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { getCurrencySymbol } from '@/lib/currency';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const [productCount, allProducts, salesToday, purchasesToday, currency] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({ select: { id: true, name: true, sku: true, quantity: true, reorderLevel: true } }),
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today } } }),
    prisma.purchase.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today } } }),
    getCurrencySymbol()
  ]);

  const lowStock = allProducts.filter((p) => p.quantity <= p.reorderLevel);

  return NextResponse.json({
    productCount,
    lowStockCount: lowStock.length,
    salesToday: Number(salesToday._sum.total ?? 0),
    purchasesToday: Number(purchasesToday._sum.total ?? 0),
    currency,
    lowStockItems: lowStock,
    userName: user.name
  });
}
