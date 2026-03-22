import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

type Page =
  | '/dashboard'
  | '/stock'
  | '/stock/new'
  | '/purchase'
  | '/purchase/new'
  | '/sales'
  | '/sales/new'
  | '/notifications'
  | '/settings'
  | '/actions'
  | '/reports'
  | '/suppliers'
  | '/suppliers/new'
  | '/users';

const ACCESS: Record<Page, Role[]> = {
  '/dashboard':     [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/stock':         [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/stock/new':     [Role.OWNER, Role.MANAGER],
  '/purchase':      [Role.OWNER, Role.MANAGER],
  '/purchase/new':  [Role.OWNER, Role.MANAGER],
  '/sales':         [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/sales/new':     [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/notifications': [Role.OWNER, Role.MANAGER],
  '/settings':      [Role.OWNER],
  '/actions':       [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/reports':       [Role.OWNER, Role.MANAGER],
  '/suppliers':     [Role.OWNER, Role.MANAGER],
  '/suppliers/new': [Role.OWNER, Role.MANAGER],
  '/users':         [Role.OWNER],
};

export function canAccess(role: Role, page: string): boolean {
  return (ACCESS as Record<string, Role[]>)[page]?.includes(role) ?? false;
}

export function requireRole(role: Role, page: Page) {
  if (!canAccess(role, page)) redirect('/dashboard');
}

export function getNavLinks(role: Role) {
  const all: { href: Page; label: string }[] = [
    { href: '/actions',       label: 'Quick Actions' },
    { href: '/dashboard',     label: 'Dashboard' },
    { href: '/stock',         label: 'Stock' },
    { href: '/purchase',      label: 'Purchases' },
    { href: '/sales',         label: 'Sales & Bills' },
    { href: '/suppliers',     label: 'Suppliers' },
    { href: '/reports',       label: 'P&L Reports' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/users',         label: 'Team' },
    { href: '/settings',      label: 'Settings' },
  ];
  return all.filter((link) => canAccess(role, link.href));
}
