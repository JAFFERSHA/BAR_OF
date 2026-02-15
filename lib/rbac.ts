import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

type Page = '/dashboard' | '/stock' | '/purchase' | '/sales' | '/notifications' | '/settings';

const ACCESS: Record<Page, Role[]> = {
  '/dashboard':     [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/stock':         [Role.OWNER, Role.MANAGER],
  '/purchase':      [Role.OWNER, Role.MANAGER],
  '/sales':         [Role.OWNER, Role.MANAGER, Role.STAFF],
  '/notifications': [Role.OWNER, Role.MANAGER],
  '/settings':      [Role.OWNER],
};

export function canAccess(role: Role, page: Page): boolean {
  return ACCESS[page]?.includes(role) ?? false;
}

export function requireRole(role: Role, page: Page) {
  if (!canAccess(role, page)) {
    redirect('/dashboard');
  }
}

export function getNavLinks(role: Role) {
  const all: { href: Page; label: string }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/stock', label: 'Stock' },
    { href: '/purchase', label: 'Purchases' },
    { href: '/sales', label: 'Sales & Bills' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/settings', label: 'Settings' },
  ];
  return all.filter((link) => canAccess(role, link.href));
}