import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol } from '@/lib/currency';
import { SaleForm } from '../SaleForm';

export default async function NewSalePage() {
  const user = await requireUser();
  requireRole(user.role, '/sales/new');

  const taxSetting = await prisma.setting.findUnique({ where: { key: 'taxRate' } });
  const defaultTaxRate = parseFloat(taxSetting?.value ?? '0.07');

  const [products, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    getCurrencySymbol(),
  ]);

  return (
    <div className="app-shell">
      <Nav current="/sales" />
      <main className="main">

        {/* ── Header ── */}
        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>New Bill</h1>
            <p className="muted" style={{ fontSize: 13 }}>Create a customer bill and deduct stock automatically.</p>
          </div>
          <Link href="/sales" className="button secondary" style={{ textDecoration: 'none' }}>
            ← Back to Sales
          </Link>
        </div>

        {/* ── New bill form ── */}
        <div className="panel">
          <SaleForm products={products} currency={currency} defaultTaxRate={defaultTaxRate} />
        </div>

      </main>
    </div>
  );
}
