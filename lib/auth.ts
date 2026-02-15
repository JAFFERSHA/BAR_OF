import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { createSession } from './session';

export async function authenticate(identifier: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { phone: identifier }]
    }
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  await createSession({ userId: user.id, role: user.role });
  return user;
}
