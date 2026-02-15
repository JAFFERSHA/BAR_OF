import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';

export default async function NotificationsPage() {
  const user = await requireUser();
  requireRole(user.role, '/notifications');

  const notes = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <div className="app-shell">
      <Nav current="/notifications" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Notifications</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Automatic alerts for low stock, purchases, and bills.
            </p>
          </div>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id}>
                  <td className="muted">{n.createdAt.toLocaleString()}</td>
                  <td>{n.type.replace('_', ' ')}</td>
                  <td>{n.message}</td>
                </tr>
              ))}
              {notes.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No notifications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
