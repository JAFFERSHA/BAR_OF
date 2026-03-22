import Link from 'next/link';
import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { deleteSupplier } from './actions';

export default async function SuppliersPage() {
  const user = await requireUser();
  requireRole(user.role, '/suppliers');

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="app-shell">
      <Nav current="/suppliers" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Suppliers</h1>
            <p className="muted" style={{ fontSize: 13 }}>Manage your stock suppliers and contacts.</p>
          </div>
          <Link href="/suppliers/new" className="button" style={{ textDecoration: 'none' }}>+ Add Supplier</Link>
        </div>

        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Purchases</th>
                {user.role === Role.OWNER && <th></th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No suppliers yet. Add one above.</td></tr>
              ) : suppliers.map((s, i) => (
                <tr key={s.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="muted">{s.contact || '—'}</td>
                  <td className="muted">{s.phone || '—'}</td>
                  <td className="muted">{s.email || '—'}</td>
                  <td><span className="pill ok">{s._count.purchases}</span></td>
                  {user.role === Role.OWNER && (
                    <td>
                      <form action={deleteSupplier} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="button secondary" type="submit" style={{ fontSize: 12, padding: '4px 10px', color: '#ff8c8e' }}>Delete</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
