import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole, canAccess } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { Role } from '@prisma/client';

export default async function StockPage() {
  const user = await requireUser();
  requireRole(user.role, '/stock');

  const [products, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
    getCurrencySymbol(),
  ]);

  const lowCount = products.filter((p) => p.quantity <= p.reorderLevel).length;
  const canCreate = canAccess(user.role, '/stock/new');

  return (
    <div className="app-shell">
      <Nav current="/stock" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Stock</h1>
            <p className="muted" style={{ fontSize: 13 }}>View inventory, quantities, and reorder thresholds.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {lowCount > 0 && <span className="pill danger">⚠ {lowCount} low</span>}
            {canCreate && (
              <Link href="/stock/new" className="button" style={{ textDecoration: 'none' }}>
                + Add Product
              </Link>
            )}
          </div>
        </div>

        {/* ── Inventory table (full-width) ── */}
        <div className="panel">
          <div className="heading-row">
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              📦 Inventory
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                {products.length} SKUs
              </span>
            </h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Reorder</th>
                <th>Cost</th>
                <th>Sale Price</th>
                <th>Status</th>
                {canCreate && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No products yet.</td></tr>
              ) : products.map((p, i) => (
                <tr key={p.id}>
                  <td className="muted" style={{ fontSize: 12 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td><code style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{p.sku}</code></td>
                  <td className="muted">{p.unit}</td>
                  <td>
                    <span className={`pill ${p.quantity <= p.reorderLevel ? 'danger' : 'ok'}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="muted">{p.reorderLevel}</td>
                  <td className="muted">{formatMoney(p.costPrice, currency)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatMoney(p.salePrice, currency)}</td>
                  <td>
                    {p.quantity <= p.reorderLevel
                      ? <span className="pill danger">Low</span>
                      : <span className="pill ok">OK</span>
                    }
                  </td>
                  {canCreate && (
                    <td>
                      <Link href={`/stock/${p.id}`} className="button secondary" style={{ textDecoration: 'none', fontSize: 12, padding: '4px 10px' }}>Edit</Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
