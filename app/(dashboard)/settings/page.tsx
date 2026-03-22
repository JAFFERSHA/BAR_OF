import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, CURRENCY_OPTIONS } from '@/lib/currency';
import { updateCurrency, updateBarName, updateTaxRate } from './actions';

async function getSetting(key: string, fallback: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export default async function SettingsPage() {
  const user = await requireUser();
  requireRole(user.role, '/settings');

  const [currentCurrency, barName, taxRateStr] = await Promise.all([
    getCurrencySymbol(),
    getSetting('barName', 'Bar Ops'),
    getSetting('taxRate', '0.07'),
  ]);

  const taxRate = parseFloat(taxRateStr);

  return (
    <div className="app-shell">
      <Nav current="/settings" />
      <main className="main">

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Settings</h1>
          <p className="muted" style={{ fontSize: 13 }}>App-wide configuration. Only the Owner can change these.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>

          {/* ── Bar / Business Name ── */}
          <div className="panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>🍺 Bar / Business Name</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Shown on customer bills and email receipts.
            </p>
            <form action={updateBarName} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Business name</label>
                <input name="barName" defaultValue={barName} placeholder="e.g. The Royal Bar" required />
              </div>
              <button className="button" type="submit" style={{ flexShrink: 0 }}>Save</button>
            </form>
          </div>

          {/* ── Currency ── */}
          <div className="panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>💱 Currency</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Used on all prices, bills, and reports.
            </p>
            <form action={updateCurrency} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Currency symbol</label>
                <select name="currency" defaultValue={currentCurrency}>
                  {CURRENCY_OPTIONS.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym === '$' ? '$ — US Dollar' : sym === '₹' ? '₹ — Indian Rupee' : sym === '€' ? '€ — Euro' : '£ — British Pound'}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button" type="submit" style={{ flexShrink: 0 }}>Save</button>
            </form>
          </div>

          {/* ── Tax Rate ── */}
          <div className="panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>🧾 Default Tax Rate</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Applied automatically when creating customer bills. Set to 0 for no tax.
            </p>
            <form action={updateTaxRate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Tax rate (0.00 – 1.00)</label>
                <input
                  name="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  defaultValue={taxRate}
                  placeholder="e.g. 0.05 for 5%"
                />
              </div>
              <button className="button" type="submit" style={{ flexShrink: 0 }}>Save</button>
            </form>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Current: <strong style={{ color: 'var(--accent)' }}>{(taxRate * 100).toFixed(1)}%</strong>
              {taxRate === 0 ? ' — No tax applied' : taxRate === 0.05 ? ' — GST 5%' : taxRate === 0.12 ? ' — GST 12%' : taxRate === 0.18 ? ' — GST 18%' : ''}
            </p>
          </div>

          {/* ── Info card ── */}
          <div className="panel" style={{ borderColor: 'rgba(88,173,247,0.2)', background: 'rgba(88,173,247,0.04)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#58adf7' }}>ℹ️ About This App</h3>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              <div>📦 Stock management with reorder alerts</div>
              <div>🛒 Purchase logging from suppliers</div>
              <div>🧾 Customer billing with SMS &amp; email notify</div>
              <div>📊 Profit &amp; Loss reports (daily / weekly / monthly / yearly)</div>
              <div>👥 Role-based access: Owner · Manager · Staff</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
