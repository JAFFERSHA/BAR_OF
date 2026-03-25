import { jwtVerify, SignJWT } from 'jose';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export const SESSION_TTL = 60 * 60 * 8; // 8 hours

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export type MobileSessionPayload = {
  userId: string;
  role: string;
};

export async function createMobileToken(payload: MobileSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_TTL}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function getMobileSession(req: NextRequest): Promise<MobileSessionPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify<MobileSessionPayload>(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function requireMobileUser(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
