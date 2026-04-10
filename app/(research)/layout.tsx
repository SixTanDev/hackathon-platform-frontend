'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
