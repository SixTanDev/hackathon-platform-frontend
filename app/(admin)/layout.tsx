'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="admin" allowNoContext>{children}</DashboardShell>;
}
