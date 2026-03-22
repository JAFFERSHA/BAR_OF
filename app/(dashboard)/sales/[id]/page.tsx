import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const [sale, currency] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, costPrice: true } } } },
        user: { select: { name: true } }
      }
    }),
    getCurrencySymbol(),
  ]);

  if (!sale) notFound();

  const totalCogs = sale.items.reduce((s, i) => s + i.quantity * Number(i.product.costPrice), 0);
  const grossProfit = Number(sale.subtotal) - totalCogs;

  return (
    <div className="app-shell">
      <Nav current="/sales" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Bill Receipt</h1>
            <p className="muted" style={{ fontSize: 13 }}>#{sale.id.slice(-8).toUpperCase()}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button secondary" onClick={() => window.print()} style={{ fontSize: 13 }}>
              🖨️ Print
            </button>
            <Link href="/sales" className="button secondary" style={{ textDecoration: 'none' }}>← Back</Link>
          </div>
        </div>

        {/* Receipt panel */}
        <div className="panel" style={{ maxWidth: 640, margin: '0 auto' }} id="bill-print">

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🍺</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginBottom: 2 }}>Bar Ops</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Stock Management System</div>
          </div>

          {/* Bill info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: 13 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</div>
              <div style={{ fontWeight: 600 }}>{sale.customer}</div>
              {sale.customerPhone && <div className="muted">{sale.customerPhone}</div>}
              {sale.customerEmail && <div className="muted">{sale.customerEmail}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill Details</div>
              <div style={{ fontWeight: 600 }}>#{sale.id.slice(-8).toUpperCase()}</div>
              <div className="muted">{sale.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              <div className="muted">Billed by: {sale.user.name}</div>
            </div>
          </div>

          {/* Items table */}
          <table className="table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.product.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{formatMoney(item.unitPrice, currency)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(Number(item.unitPrice) * item.quantity, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {[
              { label: 'Subtotal', val: Number(sale.subtotal) },
              { label: 'Tax', val: Number(sale.tax) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: 'var(--muted)' }}>
                <span>{row.label}</span><span>{formatMoney(row.val, currency)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span>Total</span><span>{formatMoney(Number(sale.total), currency)}</span>
            </div>
          </div>

          {/* Profit insight (hidden from customer on print) */}
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 10 }} className="no-print">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#3ecf8e', marginBottom: 6 }}>
              Profit Insight (internal)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="muted">Revenue</span><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatMoney(Number(sale.subtotal), currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="muted">Est. COGS</span><span style={{ color: '#ff8c8e', fontWeight: 600 }}>-{formatMoney(totalCogs, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(62,207,142,0.2)' }}>
              <span>Gross Profit</span>
              <span style={{ color: grossProfit >= 0 ? '#3ecf8e' : '#ff8c8e' }}>{formatMoney(grossProfit, currency)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
            Thank you for visiting! 🍺
          </div>
        </div>

      </main>
    </div>
  );
}
