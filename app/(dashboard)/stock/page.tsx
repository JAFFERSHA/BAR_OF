import Nav from '@/app/components/Nav';
import { createProduct } from './actions';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function StockPage() {
  const user = await requireUser();
  requireRole(user.role, '/stock');

  const [products, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
    getCurrencySymbol(),
  ]);

  const lowCount = products.filter((p) => p.quantity <= p.reorderLevel).length;

  return (
    <div className="app-shell">
      <Nav current="/stock" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Stock</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Manage SKUs, quantities, and reorder thresholds.
            </p>
          </div>
          <div className="pill danger">Low: {lowCount}</div>
        </div>

        <div className="card-grid">
          <div className="card">
            <h3>Add product</h3>
            <form action={createProduct}>
              <div className="two-col">
                <div className="field">
                  <label>Name</label>
                  <input name="name" required />
                </div>
                <div className="field">
                  <label>SKU</label>
                  <input name="sku" required />
                </div>
                <div className="field">
                  <label>Unit</label>
                  <input name="unit" placeholder="bottle / can / ml" required />
                </div>
                <div className="field">
                  <label>Cost price ({currency})</label>
                  <input name="costPrice" type="number" step="0.01" required />
                </div>
                <div className="field">
                  <label>Sale price ({currency})</label>
                  <input name="salePrice" type="number" step="0.01" required />
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input name="quantity" type="number" min="0" required />
                </div>
                <div className="field">
                  <label>Reorder level</label>
                  <input name="reorderLevel" type="number" min="1" required />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="button" type="submit">
                  Save product
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3>Inventory</h3>
            <div className="muted" style={{ marginBottom: 8 }}>
              {products.length} SKUs
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Reorder</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="muted">{p.sku}</td>
                    <td>
                      <span className={`pill ${p.quantity <= p.reorderLevel ? 'danger' : 'ok'}`}>{p.quantity}</span>
                    </td>
                    <td>{p.reorderLevel}</td>
                    <td>{formatMoney(p.salePrice, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
