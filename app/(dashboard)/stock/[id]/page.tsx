import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { updateProduct, deleteProduct } from '../actions';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  requireRole(user.role, '/stock/new'); // same OWNER/MANAGER permission

  const [product, currency] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getCurrencySymbol(),
  ]);

  if (!product) notFound();

  return (
    <div className="app-shell">
      <Nav current="/stock" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Edit Product</h1>
            <p className="muted" style={{ fontSize: 13 }}>{product.name} · {product.sku}</p>
          </div>
          <Link href="/stock" className="button secondary" style={{ textDecoration: 'none' }}>← Back to Stock</Link>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>✏️ Update Details</h3>
          <form action={updateProduct}>
            <input type="hidden" name="id" value={product.id} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Name</label>
                <input name="name" defaultValue={product.name} required />
              </div>
              <div className="field">
                <label>SKU</label>
                <input name="sku" defaultValue={product.sku} required />
              </div>
              <div className="field">
                <label>Unit</label>
                <input name="unit" defaultValue={product.unit} required />
              </div>
              <div className="field">
                <label>Cost price ({currency})</label>
                <input name="costPrice" type="number" step="0.01" defaultValue={Number(product.costPrice)} required />
              </div>
              <div className="field">
                <label>Sale price ({currency})</label>
                <input name="salePrice" type="number" step="0.01" defaultValue={Number(product.salePrice)} required />
              </div>
              <div className="field">
                <label>Quantity (current stock)</label>
                <input name="quantity" type="number" min="0" defaultValue={product.quantity} required />
              </div>
              <div className="field">
                <label>Reorder level</label>
                <input name="reorderLevel" type="number" min="1" defaultValue={product.reorderLevel} required />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="button" type="submit">Save changes</button>
            </div>
          </form>
        </div>

        {/* Danger zone */}
        <div className="panel" style={{ borderColor: 'rgba(239,93,96,0.3)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#ff8c8e' }}>⚠️ Danger Zone</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            Deleting a product is permanent and cannot be undone. Sales history referencing this product will remain.
          </p>
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <button className="button" type="submit" style={{ background: 'var(--danger)', color: '#fff' }}>
              Delete Product
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
