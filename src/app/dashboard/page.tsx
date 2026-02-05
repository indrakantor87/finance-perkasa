'use client';

import React from 'react';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Coffee
} from 'lucide-react';

export default function DashboardPage() {
  // Mock Data
  const employeeStatusData = [
    { name: 'Kontrak', value: 2, color: '#e5e7eb' }, // gray
    { name: 'Tetap', value: 46, color: '#4fd1c5' }, // teal
  ];

  const tenureData = [
    { name: '0-3', value: 40 },
    { name: '3-5', value: 30 },
    { name: '5-10', value: 20 },
    { name: '>10', value: 10 },
  ];

  const departmentData = [
    { name: 'Business Development', value: 8, percentage: 19, color: '#a7f3d0' },
    { name: 'Executive Team', value: 4, percentage: 10, color: '#fbcfe8' },
    { name: 'Operations', value: 7, percentage: 17, color: '#fde68a' },
    { name: 'Production', value: 20, percentage: 47, color: '#d8b4fe' },
    { name: 'Research & Development', value: 4, percentage: 10, color: '#bae6fd' },
  ];

  const genderData = [
    { name: 'Pria', value: 70 },
    { name: 'Wanita', value: 30 },
  ];
  const COLORS_GENDER = ['#3b82f6', '#22c55e'];

  const leaveStatsData = [
    { name: 'Business Development', value: 5 },
    { name: 'Executive Team', value: 8 },
    { name: 'Operations', value: 12 },
    { name: 'Production', value: 25 },
    { name: 'Research & Development', value: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">FINANCE PERKASA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-5 h-5 cursor-pointer hover:text-gray-200" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] w-4 h-4 flex items-center justify-center rounded-full">3</span>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Secondary Navigation (Tabs) */}
      <div className="bg-white shadow-sm border-b overflow-x-auto">
        <div className="px-6 flex gap-6 text-sm font-medium min-w-max">
          <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" href="/dashboard" active />
          <NavItem icon={<Users size={16} />} label="Data Karyawan" href="/employees" />
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Top Row Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Status Karyawan */}
          <Card title="STATUS KARYAWAN">
            <div className="flex items-center justify-center h-48">
              <div className="w-full space-y-4">
                {employeeStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.value}</span>
                      <span className="text-xs text-gray-400">
                        {Math.round((item.value / 48) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
                {/* Visual Bar representation */}
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex mt-2">
                  <div className="h-full bg-[#4fd1c5]" style={{ width: '96%' }}></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Lama Masa Kerja */}
          <Card title="LAMA MASA KERJA">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenureData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Departemen */}
          <Card title="DEPARTEMEN">
            <div className="h-48 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
               {/* Stacked bar visualization */}
               <div className="flex h-3 w-full rounded-full overflow-hidden mb-4">
                 {departmentData.map((dept, idx) => (
                   <div key={idx} style={{ width: `${dept.percentage}%`, backgroundColor: dept.color }} />
                 ))}
               </div>
               
               <div className="space-y-2">
                 {departmentData.map((dept, idx) => (
                   <div key={idx} className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }}></div>
                       <span className="truncate max-w-[100px]" title={dept.name}>{dept.name}</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="font-semibold">{dept.value}</span>
                        <span className="text-gray-400">{dept.percentage}%</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </Card>

          {/* Gender */}
          <Card title="GENDER">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs mt-[-20px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Pria
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Wanita
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Calendar (Mock) */}
          <Card title={`Maret 2026`}> 
            {/* Using 2026 because env date is 2026 */}
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
               <div className="text-center text-gray-400">
                 <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                 <p>Kalender Absensi</p>
               </div>
            </div>
          </Card>

          {/* Statistik Cuti */}
          <Card title="Statistik Cuti">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={leaveStatsData} margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#93c5fd" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Rekap Hari Ini */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Rekap Hari Ini</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Sudah Absen" value={35} color="bg-green-500" icon={<UserCheck className="w-5 h-5" />} />
              <StatCard label="Belum Absen" value={12} color="bg-red-400" icon={<LogOut className="w-5 h-5" />} />
              <StatCard label="Izin" value={0} color="bg-yellow-400" icon={<FileText className="w-5 h-5" />} />
              <StatCard label="Cuti" value={2} color="bg-blue-400" icon={<Coffee className="w-5 h-5" />} />
              <StatCard label="Dinas Luar" value={4} color="bg-teal-600" icon={<Banknote className="w-5 h-5" />} />
              <StatCard label="Terlambat" value={6} color="bg-pink-500" icon={<Clock className="w-5 h-5" />} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 py-4 cursor-pointer border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Card({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) {
  return (
    <div className={`${color} text-white p-3 rounded-lg flex items-center justify-between shadow-sm`}>
      <div>
        <div className="text-xs opacity-90 mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      <div className="opacity-80">
        {icon}
      </div>
    </div>
  );
}
