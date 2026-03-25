import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-session';
import { supplierSchema } from '@/lib/validation';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ suppliers });
}

export async function POST(req: NextRequest) {
  const user = await requireMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({ data: parsed.data });
  return NextResponse.json({ supplier }, { status: 201 });
}
