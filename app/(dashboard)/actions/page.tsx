import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { requireUser } from '@/lib/session';
import { canAccess } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { Role } from '@prisma/client';

const ALL_ACTIONS = [
  { href: '/sales/new',     label: 'New Bill',       desc: 'Create a customer bill and deduct stock',    icon: '🧾', color: '#f9b248' },
  { href: '/purchase/new',  label: 'Log Purchase',   desc: 'Record incoming stock from a supplier',      icon: '🛒', color: '#3ecf8e' },
  { href: '/stock/new',     label: 'Add Product',    desc: 'Add a new product to inventory',             icon: '➕', color: '#58adf7' },
  { href: '/stock',         label: 'View Inventory', desc: 'Check stock levels and reorder thresholds',  icon: '📦', color: '#58adf7' },
  { href: '/sales',         label: 'View Sales',     desc: 'Browse recent bills and transactions',       icon: '📋', color: '#f9b248' },
  { href: '/purchase',      label: 'View Purchases', desc: 'Browse purchase history',                    icon: '📑', color: '#3ecf8e' },
  { href: '/reports',       label: 'P&L Reports',    desc: 'Profit & loss by day, week, month, year',    icon: '📊', color: '#a78bfa' },
  { href: '/suppliers',     label: 'Suppliers',      desc: 'Manage your stock suppliers',                icon: '🚚', color: '#fb923c' },
  { href: '/users',         label: 'Team',           desc: 'Add or remove staff accounts',               icon: '👥', color: '#e879f9' },
  { href: '/dashboard',     label: 'Dashboard',      desc: "Today's KPIs and low-stock summary",         icon: '🏠', color: '#a78bfa' },
  { href: '/notifications', label: 'Notifications',  desc: 'View alerts for low stock and transactions', icon: '🔔', color: '#fb923c' },
  { href: '/settings',      label: 'Settings',       desc: 'Change currency, tax rate, and bar name',    icon: '⚙️', color: '#94a3b8' },
];

export default async function QuickActionsPage() {
  const user = await requireUser();
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  let salesTotal = 0, purchasesTotal = 0, lowStockCount = 0, grossProfit = 0, currency = '₹';

  try {
    const [salesAgg, purchasesAgg, allProducts, curr, saleItems] = await Promise.all([
      prisma.sale.aggregate({ _sum: { subtotal: true }, where: { createdAt: { gte: today } } }),
      prisma.purchase.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today } } }),
      prisma.product.findMany({ select: { quantity: true, reorderLevel: true, costPrice: true } }),
      getCurrencySymbol(),
      prisma.saleItem.findMany({
        where: { sale: { createdAt: { gte: today } } },
        include: { product: { select: { costPrice: true } } }
      }),
    ]);
    salesTotal     = Number(salesAgg._sum.subtotal || 0);
    purchasesTotal = Number(purchasesAgg._sum.total || 0);
    lowStockCount  = allProducts.filter(p => p.quantity <= p.reorderLevel).length;
    currency       = curr;
    const cogs     = saleItems.reduce((s, i) => s + i.quantity * Number(i.product.costPrice), 0);
    grossProfit    = salesTotal - cogs;
  } catch { /* keep defaults */ }

  const visibleActions = ALL_ACTIONS.filter(a => canAccess(user.role as Role, a.href));
  const isProfit = grossProfit >= 0;

  return (
    <div className="app-shell">
      <Nav current="/actions" />
      <main className="main">

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Quick Actions</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            Good {getGreeting()}, {user.name.split(' ')[0]}. Here&apos;s today at a glance.
          </p>
        </div>

        {/* ── Today summary strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          <div className="stat-strip-card">
            <div className="stat-strip-label">Revenue Today</div>
            <div className="stat-strip-val" style={{ color: '#f9b248' }}>{formatMoney(salesTotal, currency)}</div>
          </div>
          <div className="stat-strip-card">
            <div className="stat-strip-label">Stock Cost</div>
            <div className="stat-strip-val" style={{ color: '#fb923c' }}>{formatMoney(purchasesTotal, currency)}</div>
          </div>
          <div className="stat-strip-card profit-card" data-profit={isProfit ? 'true' : 'false'}>
            <div className="stat-strip-label">Today&apos;s Profit</div>
            <div className="stat-strip-val" style={{ color: isProfit ? '#3ecf8e' : '#ff8c8e' }}>
              {isProfit ? '+' : ''}{formatMoney(grossProfit, currency)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {isProfit ? '▲ Profit' : '▼ Loss'} · excl. tax
            </div>
          </div>
          <div className="stat-strip-card">
            <div className="stat-strip-label">Low Stock</div>
            <div className="stat-strip-val" style={{ color: lowStockCount > 0 ? '#ff8c8e' : '#3ecf8e' }}>
              {lowStockCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>items need restock</div>
          </div>
        </div>

        {/* ── Action cards grid ── */}
        <div className="action-grid">
          {visibleActions.map((action) => (
            <Link key={action.href} href={action.href} className="action-card" style={{ '--card-color': action.color } as React.CSSProperties}>
              <div style={{ fontSize: 36, lineHeight: 1 }}>{action.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: action.color, marginBottom: 4 }}>{action.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{action.desc}</div>
              </div>
              <div style={{ marginTop: 'auto', fontSize: 12, color: action.color, fontWeight: 600 }}>Open →</div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
