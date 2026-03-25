import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.setting.findUnique({ where: { key: 'currency' } });
  return NextResponse.json({ currency: row?.value ?? '$', currencyOptions: CURRENCY_OPTIONS });
}

export async function PUT(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { currency } = body ?? {};

  if (!currency || !CURRENCY_OPTIONS.includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: { value: currency },
    create: { key: 'currency', value: currency }
  });

  return NextResponse.json({ currency });
}
