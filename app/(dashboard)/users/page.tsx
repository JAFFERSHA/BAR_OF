import Nav from '@/app/components/Nav';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { createUser, deleteUser } from './actions';

const ROLE_COLORS: Record<Role, string> = {
  OWNER:   '#f9b248',
  MANAGER: '#58adf7',
  STAFF:   '#3ecf8e',
};

export default async function UsersPage() {
  const user = await requireUser();
  requireRole(user.role, '/users');

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });

  return (
    <div className="app-shell">
      <Nav current="/users" />
      <main className="main">

        <div className="heading-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Team</h1>
            <p className="muted" style={{ fontSize: 13 }}>Manage staff accounts and roles. Only owners can access this page.</p>
          </div>
        </div>

        {/* ── Add user form ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>➕ Add Team Member</h3>
          <form action={createUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Full Name</label>
                <input name="name" placeholder="e.g. Ramesh Gupta" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" placeholder="staff@bar.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" type="tel" placeholder="+91 9876543210" />
              </div>
              <div className="field">
                <label>Role</label>
                <select name="role" required>
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="field">
                <label>Password</label>
                <input name="password" type="password" placeholder="Min 6 characters" required />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="button" type="submit">Add Member</button>
            </div>
          </form>
        </div>

        {/* ── Users list ── */}
        <div className="panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>👥 Team Members ({users.length})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}{u.id === user.id && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>(you)</span>}</td>
                  <td className="muted">{u.email || '—'}</td>
                  <td className="muted">{u.phone || '—'}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: `${ROLE_COLORS[u.role]}18`,
                      color: ROLE_COLORS[u.role],
                      border: `1px solid ${ROLE_COLORS[u.role]}33`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{u.createdAt.toLocaleDateString('en-IN')}</td>
                  <td>
                    {u.id !== user.id && (
                      <form action={deleteUser} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="button secondary" type="submit" style={{ fontSize: 12, padding: '4px 10px', color: '#ff8c8e' }}>Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
