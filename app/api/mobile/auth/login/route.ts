import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createMobileToken } from '@/lib/mobile-session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { identifier, password } = body ?? {};

  if (!identifier || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: String(identifier).toLowerCase() }, { phone: String(identifier) }] }
  });

  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const token = await createMobileToken({ userId: user.id, role: user.role });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone }
  });
}
