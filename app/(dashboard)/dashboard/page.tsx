import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function DashboardPage() {
  const user = await requireUser();
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const [productCount, allProducts, salesToday, purchasesToday, currency] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany(),
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today } } }),
    prisma.purchase.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today } } }),
    getCurrencySymbol(),
  ]);

  const lowStock = allProducts.filter((p) => p.quantity <= p.reorderLevel);

  return (
    <div className="app-shell">
      <Nav current="/dashboard" />
      <main className="main">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Hi, {user.name} 👋
          </h1>
          <p className="muted" style={{ fontSize: 13 }}>
            Here&apos;s what&apos;s happening at the bar today.
          </p>
        </div>

        {/* KPI cards */}
        <div className="card-grid">
          <div className="card">
            <h3>Total Products <span className="stat-icon">📦</span></h3>
            <div className="stat-value">{productCount}</div>
            <div className="stat-sub">active SKUs in inventory</div>
          </div>

          <div className="card" style={{ borderColor: lowStock.length > 0 ? 'rgba(239,93,96,0.3)' : undefined }}>
            <h3>Low Stock <span className="stat-icon">⚠️</span></h3>
            <div className="stat-value" style={{ color: lowStock.length > 0 ? '#ff8c8e' : 'var(--success)' }}>
              {lowStock.length}
            </div>
            <div className="stat-sub">
              {lowStock.length > 0 ? 'items need restocking' : 'all items well stocked'}
            </div>
          </div>

          <div className="card">
            <h3>Sales Today <span className="stat-icon">💰</span></h3>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {formatMoney(salesToday._sum.total || 0, currency)}
            </div>
            <div className="stat-sub">customer bills issued</div>
          </div>

          <div className="card">
            <h3>Purchases Today <span className="stat-icon">🛒</span></h3>
            <div className="stat-value">
              {formatMoney(purchasesToday._sum.total || 0, currency)}
            </div>
            <div className="stat-sub">stock intake cost</div>
          </div>
        </div>

        {/* Low stock watchlist */}
        <div className="panel">
          <div className="heading-row">
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>⚠️ Low Stock Watchlist</h3>
            {lowStock.length > 0 && (
              <span className="pill danger">{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {lowStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>All good!</div>
              <div style={{ fontSize: 13 }}>No SKUs are below their reorder threshold.</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Qty</th>
                  <th>Reorder At</th>
                  <th>Deficit</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="muted">{p.sku}</td>
                    <td>
                      <span className="pill danger">{p.quantity}</span>
                    </td>
                    <td className="muted">{p.reorderLevel}</td>
                    <td style={{ color: '#ff8c8e', fontWeight: 600 }}>
                      -{p.reorderLevel - p.quantity}
                    </td>
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
