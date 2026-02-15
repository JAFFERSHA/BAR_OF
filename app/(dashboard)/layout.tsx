import { requireUser } from '@/lib/session';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
