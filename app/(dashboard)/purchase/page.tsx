import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { PurchaseForm } from './PurchaseForm';

export default async function PurchasePage() {
  const user = await requireUser();
  requireRole(user.role, '/purchase');

  const [products, suppliers, purchases, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.purchase.findMany({
      include: { supplier: true, items: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    getCurrencySymbol(),
  ]);

  return (
    <div className="app-shell">
      <Nav current="/purchase" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Purchases</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Log stock intake and update inventory.
            </p>
          </div>
        </div>

        <div className="card-grid">
          <div className="card">
            <h3>New purchase</h3>
            <PurchaseForm products={products} suppliers={suppliers} currency={currency} />
          </div>

          <div className="card">
            <h3>Recent purchases</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{p.createdAt.toLocaleString()}</td>
                    <td>{p.supplier.name}</td>
                    <td>{p.items.length}</td>
                    <td>{formatMoney(p.total, currency)}</td>
                    <td className="muted">{p.user.name}</td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No purchases yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
