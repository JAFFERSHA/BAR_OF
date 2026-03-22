import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol } from '@/lib/currency';
import { PurchaseForm } from '../PurchaseForm';

export default async function NewPurchasePage() {
  const user = await requireUser();
  requireRole(user.role, '/purchase/new');

  const [products, suppliers, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    getCurrencySymbol(),
  ]);

  return (
    <div className="app-shell">
      <Nav current="/purchase" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Log Purchase</h1>
            <p className="muted" style={{ fontSize: 13 }}>Record incoming stock from a supplier.</p>
          </div>
          <Link href="/purchase" className="button secondary" style={{ textDecoration: 'none' }}>
            ← Back to Purchases
          </Link>
        </div>

        {/* ── New purchase form ── */}
        <div className="panel">
          <PurchaseForm products={products} suppliers={suppliers} currency={currency} />
        </div>

      </main>
    </div>
  );
}
