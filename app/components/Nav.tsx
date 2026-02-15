import Link from 'next/link';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { SessionPayload } from '@/lib/session';
import { getNavLinks } from '@/lib/rbac';
import { Role } from '@prisma/client';

export default async function Nav({ current }: { current: string }) {
  const store = await cookies();
  const session = store.get('session');
  let payload: SessionPayload | null = null;
  if (session?.value && process.env.AUTH_SECRET) {
    try {
      const { payload: data } = await jwtVerify<SessionPayload>(
        session.value,
        new TextEncoder().encode(process.env.AUTH_SECRET || '')
      );
      payload = data;
    } catch {
      payload = null;
    }
  }

  const role = (payload?.role as Role) ?? Role.STAFF;
  const links = getNavLinks(role);

  return (
    <div className="sidebar">
      <div className="nav-title">Bar Ops</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {payload ? `Signed in as ${payload.role}` : 'Not signed in'}
      </div>
      <nav>
        {links.map((link) => (
          <Link key={link.href} className={`nav-link ${current === link.href ? 'active' : ''}`} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <form method="post" action="/api/logout" style={{ marginTop: 18 }}>
        <button className="button secondary" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}