import React from 'react';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';

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
    </div>
  );
}
