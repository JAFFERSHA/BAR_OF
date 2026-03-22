import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

function startOf(period: 'day' | 'week' | 'month' | 'year') {
  const d = new Date();
  if (period === 'day')   { d.setHours(0,0,0,0); }
  if (period === 'week')  { const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0,0,0,0); }
  if (period === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
  if (period === 'year')  { d.setMonth(0,1); d.setHours(0,0,0,0); }
  return d;
}

async function getPLData(from: Date, currency: string) {
  const [salesAgg, purchasesAgg, saleItemsWithCost] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { subtotal: true, tax: true, total: true },
      _count: true,
      where: { createdAt: { gte: from } }
    }),
    prisma.purchase.aggregate({
      _sum: { total: true },
      _count: true,
      where: { createdAt: { gte: from } }
    }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from } } },
      include: { product: { select: { costPrice: true } } }
    })
  ]);

  const revenue     = Number(salesAgg._sum.subtotal || 0);
  const taxCollected= Number(salesAgg._sum.tax || 0);
  const cogs        = saleItemsWithCost.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0);
  const grossProfit = revenue - cogs;
  const margin      = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const stockCost   = Number(purchasesAgg._sum.total || 0);

  return {
    revenue, taxCollected, cogs, grossProfit, margin, stockCost,
    salesCount: salesAgg._count,
    purchasesCount: purchasesAgg._count,
  };
}

export default async function ReportsPage() {
  const user = await requireUser();
  requireRole(user.role, '/reports');

  const currency = await getCurrencySymbol();

  const [today, thisWeek, thisMonth, thisYear] = await Promise.all([
    getPLData(startOf('day'), currency),
    getPLData(startOf('week'), currency),
    getPLData(startOf('month'), currency),
    getPLData(startOf('year'), currency),
  ]);

  // Top selling products this month
  const topProducts = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { createdAt: { gte: startOf('month') } } },
    _sum: { quantity: true, unitPrice: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  const productIds = topProducts.map(p => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, costPrice: true }
  });
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const periods = [
    { label: 'Today', data: today },
    { label: 'This Week', data: thisWeek },
    { label: 'This Month', data: thisMonth },
    { label: 'This Year', data: thisYear },
  ];

  return (
    <div className="app-shell">
      <Nav current="/reports" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>P&amp;L Reports</h1>
            <p className="muted" style={{ fontSize: 13 }}>Profit &amp; Loss across all time periods.</p>
          </div>
        </div>

        {/* ── Period cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          {periods.map(({ label, data }) => {
            const isProfit = data.grossProfit >= 0;
            return (
              <div key={label} className="panel">
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: 12 }}>
                  {label}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: isProfit ? '#3ecf8e' : '#ff8c8e', letterSpacing: '-1px', lineHeight: 1 }}>
                      {isProfit ? '+' : ''}{formatMoney(data.grossProfit, currency)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Gross Profit ({data.margin.toFixed(1)}% margin)
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: isProfit ? 'rgba(62,207,142,0.12)' : 'rgba(239,93,96,0.12)',
                    color: isProfit ? '#3ecf8e' : '#ff8c8e',
                    border: `1px solid ${isProfit ? 'rgba(62,207,142,0.2)' : 'rgba(239,93,96,0.2)'}`,
                  }}>
                    {isProfit ? '▲ PROFIT' : '▼ LOSS'}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: 'Revenue (excl. tax)', val: data.revenue, color: 'var(--accent)' },
                    { label: 'Tax Collected', val: data.taxCollected, color: 'var(--muted)' },
                    { label: 'Cost of Goods Sold', val: -data.cogs, color: '#ff8c8e' },
                    { label: 'Stock Purchased', val: -data.stockCost, color: '#fb923c' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: row.color }}>
                        {row.val < 0 ? '-' : ''}{formatMoney(Math.abs(row.val), currency)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span>{data.salesCount} bills · {data.purchasesCount} purchases</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Top selling products this month ── */}
        <div className="panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🏆 Top Selling Products — This Month</h3>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>No sales this month yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Est. COGS</th>
                  <th>Est. Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row, i) => {
                  const p = productMap[row.productId];
                  const qty = row._sum.quantity || 0;
                  const rev = Number(row._sum.unitPrice || 0) * qty;
                  const cogs = Number(p?.costPrice || 0) * qty;
                  const profit = rev - cogs;
                  const margin = rev > 0 ? (profit / rev * 100) : 0;
                  return (
                    <tr key={row.productId}>
                      <td className="muted">{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{p?.name ?? '—'}</td>
                      <td style={{ fontWeight: 600 }}>{qty}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatMoney(rev, currency)}</td>
                      <td className="muted">{formatMoney(cogs, currency)}</td>
                      <td style={{ fontWeight: 700, color: profit >= 0 ? '#3ecf8e' : '#ff8c8e' }}>
                        {formatMoney(profit, currency)}
                      </td>
                      <td>
                        <span className={`pill ${margin >= 30 ? 'ok' : 'warning'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  );
}
