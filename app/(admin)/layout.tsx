'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // allowNoContext for SuperAdmin global access
  return <DashboardShell allowNoContext>{children}</DashboardShell>;
}
