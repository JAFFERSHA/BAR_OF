import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function DashboardPage() {
  const user = await requireUser();
  const [products, lowStock, salesToday, purchasesToday, currency] = await Promise.all([
    prisma.product.count(),
    prisma.product
      .findMany()
      .then((items) => items.filter((p) => p.quantity <= p.reorderLevel)),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
    }),
    prisma.purchase.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
    }),
    getCurrencySymbol(),
  ]);

  return (
    <div className="app-shell">
      <Nav current="/dashboard" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Hi, {user.name}</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Quick glance at bar performance.
            </p>
          </div>
        </div>

        <div className="card-grid">
          <div className="card">
            <h3>Products</h3>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{products}</div>
            <div className="muted">active SKUs</div>
          </div>
          <div className="card">
            <h3>Low on stock</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ff9b9d' }}>{lowStock.length}</div>
            <div className="muted">items below reorder level</div>
          </div>
          <div className="card">
            <h3>Sales today</h3>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{formatMoney(salesToday._sum.total || 0, currency)}</div>
            <div className="muted">customer bills issued</div>
          </div>
          <div className="card">
            <h3>Purchases today</h3>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{formatMoney(purchasesToday._sum.total || 0, currency)}</div>
            <div className="muted">stock intake</div>
          </div>
        </div>

        <div className="panel">
          <div className="heading-row">
            <h3 style={{ margin: 0 }}>Low stock watchlist</h3>
          </div>
          {lowStock.length === 0 ? (
            <div className="muted">All good — no SKUs below reorder threshold.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Reorder</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="muted">{p.sku}</td>
                    <td>
                      <span className="pill danger">{p.quantity}</span>
                    </td>
                    <td>{p.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
