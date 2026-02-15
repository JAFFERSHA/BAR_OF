import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { SaleForm } from './SaleForm';

export default async function SalesPage() {
  const user = await requireUser();
  const [products, recentSales, currency] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    prisma.sale.findMany({
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    getCurrencySymbol(),
  ]);

  return (
    <div className="app-shell">
      <Nav current="/sales" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Sales & Billing</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Create customer bills and decrement stock automatically.
            </p>
          </div>
        </div>

        <div className="card-grid">
          <div className="card">
            <h3>New bill</h3>
            <SaleForm products={products} currency={currency} />
          </div>

          <div className="card">
            <h3>Recent bills</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="muted">{sale.createdAt.toLocaleString()}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.items.length}</td>
                    <td>{formatMoney(sale.total, currency)}</td>
                    <td className="muted">{sale.user.name}</td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No sales yet.
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
