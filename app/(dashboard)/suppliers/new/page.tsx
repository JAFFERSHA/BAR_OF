import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { createSupplier } from '../actions';

export default async function NewSupplierPage() {
  const user = await requireUser();
  requireRole(user.role, '/suppliers/new');

  return (
    <div className="app-shell">
      <Nav current="/suppliers" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Add Supplier</h1>
            <p className="muted" style={{ fontSize: 13 }}>Add a new stock supplier to your directory.</p>
          </div>
          <Link href="/suppliers" className="button secondary" style={{ textDecoration: 'none' }}>← Back</Link>
        </div>

        <div className="panel">
          <form action={createSupplier}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Company Name</label>
                <input name="name" placeholder="e.g. United Breweries Ltd" required />
              </div>
              <div className="field">
                <label>Contact Person</label>
                <input name="contact" placeholder="e.g. Vikram Singh" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" placeholder="+91 9876543210" type="tel" />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" placeholder="orders@supplier.com" type="email" />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="button" type="submit">Save Supplier</button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
