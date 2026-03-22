import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { createProduct } from '../actions';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol } from '@/lib/currency';

export default async function NewProductPage() {
  const user = await requireUser();
  requireRole(user.role, '/stock/new');

  const currency = await getCurrencySymbol();

  return (
    <div className="app-shell">
      <Nav current="/stock" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Add Product</h1>
            <p className="muted" style={{ fontSize: 13 }}>Create a new product in your inventory.</p>
          </div>
          <Link href="/stock" className="button secondary" style={{ textDecoration: 'none' }}>
            ← Back to Stock
          </Link>
        </div>

        {/* ── Add Product form ── */}
        <div className="panel">
          <form action={createProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Name</label>
                <input name="name" placeholder="e.g. Kingfisher" required />
              </div>
              <div className="field">
                <label>SKU</label>
                <input name="sku" placeholder="e.g. KF-650" required />
              </div>
              <div className="field">
                <label>Unit</label>
                <input name="unit" placeholder="bottle / can / ml" required />
              </div>
              <div className="field">
                <label>Cost price ({currency})</label>
                <input name="costPrice" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div className="field">
                <label>Sale price ({currency})</label>
                <input name="salePrice" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div className="field">
                <label>Quantity</label>
                <input name="quantity" type="number" min="0" placeholder="0" required />
              </div>
              <div className="field">
                <label>Reorder level</label>
                <input name="reorderLevel" type="number" min="1" placeholder="10" required />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="button" type="submit">Save product</button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
