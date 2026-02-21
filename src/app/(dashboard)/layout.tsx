import React from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import ClientRoleGuard from '@/components/layout/ClientRoleGuard';

const AIAssistant = dynamic(() => import('@/components/AIAssistant'));

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950 font-sans transition-colors duration-300">
      <Header />
      <Navigation />
      {children}
      <ClientRoleGuard allowedRoles={['ADMIN', 'ADMINISTRATOR', 'DEVELOPER']}>
        <AIAssistant />
      </ClientRoleGuard>
    </div>
  );
}
