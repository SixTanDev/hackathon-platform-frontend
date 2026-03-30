'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell allowNoContext>{children}</DashboardShell>;
}
