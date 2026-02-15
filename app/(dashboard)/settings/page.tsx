import Nav from '@/app/components/Nav';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { getCurrencySymbol, CURRENCY_OPTIONS } from '@/lib/currency';
import { updateCurrency } from './actions';

export default async function SettingsPage() {
  const user = await requireUser();
  requireRole(user.role, '/settings');

  const currentCurrency = await getCurrencySymbol();

  return (
    <div className="app-shell">
      <Nav current="/settings" />
      <main className="main">
        <div className="heading-row">
          <div>
            <h1 style={{ margin: 0 }}>Settings</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Manage app-wide configuration. Only owners can access this page.
            </p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Currency</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Choose which currency symbol is shown across all prices and bills.
          </p>
          <form action={updateCurrency}>
            <div className="field">
              <label>Currency symbol</label>
              <select name="currency" defaultValue={currentCurrency}>
                {CURRENCY_OPTIONS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym === '$' ? '$ (USD)' : sym === '₹' ? '₹ (INR)' : sym === '€' ? '€ (EUR)' : '£ (GBP)'}
                  </option>
                ))}
              </select>
            </div>
            <button className="button" type="submit">
              Save
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
