import React from 'react';
import DashboardClient from './DashboardClient';
import { getDashboardStats } from './actions';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return <DashboardClient stats={stats} />;
}
