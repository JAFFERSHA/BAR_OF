import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { canAccess } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function SalesPage() {
  const user = await requireUser();
  const [recentSales, currency] = await Promise.all([
    prisma.sale.findMany({
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    getCurrencySymbol(),
  ]);

  const canCreate = canAccess(user.role, '/sales/new');

  return (
    <div className="app-shell">
      <Nav current="/sales" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Sales &amp; Billing</h1>
            <p className="muted" style={{ fontSize: 13 }}>View customer bills and transaction history.</p>
          </div>
          {canCreate && (
            <Link href="/sales/new" className="button" style={{ textDecoration: 'none' }}>
              + New Bill
            </Link>
          )}
        </div>

        {/* ── Recent bills (full-width) ── */}
        <div className="panel">
          <div className="heading-row">
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              📋 Recent Bills
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                last {recentSales.length}
              </span>
            </h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date &amp; Time</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Billed by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, i) => (
                <tr key={sale.id}>
                  <td className="muted" style={{ fontSize: 12 }}>{i + 1}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{sale.createdAt.toLocaleString()}</td>
                  <td style={{ fontWeight: 500 }}>{sale.customer}</td>
                  <td className="muted">{sale.customerPhone || '—'}</td>
                  <td>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</td>
                  <td className="muted">{formatMoney(sale.subtotal, currency)}</td>
                  <td className="muted">{formatMoney(sale.tax, currency)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatMoney(sale.total, currency)}</td>
                  <td className="muted">{sale.user.name}</td>
                  <td>
                    <Link href={`/sales/${sale.id}`} className="button secondary" style={{ textDecoration: 'none', fontSize: 12, padding: '4px 10px' }}>View</Link>
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No bills yet.
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
