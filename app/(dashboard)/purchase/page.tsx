import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole, canAccess } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function PurchasePage() {
  const user = await requireUser();
  requireRole(user.role, '/purchase');

  const [purchases, currency] = await Promise.all([
    prisma.purchase.findMany({
      include: { supplier: true, items: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    getCurrencySymbol(),
  ]);

  const canCreate = canAccess(user.role, '/purchase/new');

  return (
    <div className="app-shell">
      <Nav current="/purchase" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Purchases</h1>
            <p className="muted" style={{ fontSize: 13 }}>View stock intake history.</p>
          </div>
          {canCreate && (
            <Link href="/purchase/new" className="button" style={{ textDecoration: 'none' }}>
              + Log Purchase
            </Link>
          )}
        </div>

        {/* ── Recent purchases (full-width) ── */}
        <div className="panel">
          <div className="heading-row">
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              📋 Recent Purchases
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                last {purchases.length}
              </span>
            </h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date &amp; Time</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Logged by</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={p.id}>
                  <td className="muted" style={{ fontSize: 12 }}>{i + 1}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{p.createdAt.toLocaleString()}</td>
                  <td style={{ fontWeight: 500 }}>{p.supplier.name}</td>
                  <td>{p.items.length} item{p.items.length !== 1 ? 's' : ''}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatMoney(p.total, currency)}</td>
                  <td className="muted">{p.user.name}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No purchases yet.
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
