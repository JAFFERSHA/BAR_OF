import { NotificationType, Role } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Minimal notifier stub: records notifications and logs them.
 * Replace log() with email/SMS integrations (e.g., SendGrid/Twilio).
 */
export async function notify(type: NotificationType, message: string, relatedProductId?: string) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: [Role.MANAGER, Role.OWNER] } }
  });

  await Promise.all(
    recipients.map((user) =>
      prisma.notification.create({
        data: { message, type, userId: user.id, relatedProductId }
      })
    )
  );

  console.log(`[notify:${type}]`, message);
}
