'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { 
  PieChart, Pie, Cell, AreaChart, Area, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Coffee, ArrowUpRight, 
  ArrowDownRight, Wallet, Briefcase, ChevronRight
} from 'lucide-react';

interface DashboardStats {
  employees: {
    total: number
    newCount: number
    byStatus: { name: string, value: number }[]
    byDept: { name: string, value: number }[]
  }
  attendance: {
    present: number
    late: number
    sick: number
    permit: number
    alpha: number
    total: number
    notPresent: number
  }
  loans: {
    activeCount: number
    totalOutstanding: number
  }
  permissions: {
    pendingCount: number
  }
  salary: {
    totalMonth: number
  }
}

export default function DashboardClient({ stats }: { stats: DashboardStats | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fallback if stats failed to load
  if (!stats) {
    return <div className="p-8 text-center text-red-500">Gagal memuat data dashboard.</div>
  }

  // --- Process Data for Charts ---

  // Employee Status Colors
  const STATUS_COLORS: Record<string, string> = {
    'Tetap': '#3b82f6', // Blue
    'Kontrak': '#94a3b8', // Gray
    'Training': '#f59e0b', // Amber
    'Probation': '#10b981', // Emerald
  }
  const DEFAULT_COLOR = '#64748b'

  const employeeStatusData = stats.employees.byStatus.map(s => ({
    name: s.name,
    value: s.value,
    color: STATUS_COLORS[s.name] || DEFAULT_COLOR
  }))

  // Department Colors (Cycle)
  const DEPT_COLORS = ['#a7f3d0', '#fbcfe8', '#fde68a', '#d8b4fe', '#bae6fd', '#fed7aa']
  const departmentData = stats.employees.byDept.map((d, i) => ({
    name: d.name,
    value: d.value,
    percentage: Math.round((d.value / stats.employees.total) * 100),
    color: DEPT_COLORS[i % DEPT_COLORS.length]
  }))

  // Mock Trend Data (tetap mock karena butuh history bulanan yg kompleks querynya)
  const salaryTrend = [
    { name: 'Jan', value: 380 },
    { name: 'Feb', value: 395 },
    { name: 'Mar', value: 410 },
    { name: 'Apr', value: 405 },
    { name: 'Mei', value: 420 },
    { name: 'Jun', value: 450 },
  ];

  // Date Info
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('id-ID', dateOptions);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  // Short Currency (Juta)
  const formatShortCurrency = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}M`
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(0)}jt`
    return formatCurrency(val)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black font-sans text-slate-800 dark:text-slate-100">
      
      {/* --- Header & Navigation --- */}
      <Header />
      <Navigation />

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* --- Top Stats Row (Bento Style) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <StatWidget 
            title="Total Karyawan" 
            value={stats.employees.total.toString()}
            subtext={`+${stats.employees.newCount} bulan ini`}
            icon={<Users className="w-5 h-5 text-white" />}
            trend="up"
            color="bg-blue-600"
          />
          
          <StatWidget 
            title="Kehadiran Hari Ini" 
            value={stats.attendance.present.toString()} 
            subtext={`dari ${stats.employees.total} karyawan (${Math.round((stats.attendance.present/stats.employees.total || 1)*100)}%)`}
            icon={<UserCheck className="w-5 h-5 text-white" />}
            trend="neutral"
            color="bg-emerald-500"
          />

          <StatWidget 
            title="Pinjaman Aktif" 
            value={stats.loans.activeCount.toString()} 
            subtext={`Sisa: ${formatShortCurrency(stats.loans.totalOutstanding)}`}
            icon={<Wallet className="w-5 h-5 text-white" />}
            trend="down"
            color="bg-violet-500"
          />

          <StatWidget 
            title="Gaji Bulan Ini" 
            value={formatShortCurrency(stats.salary.totalMonth)} 
            subtext="Estimasi Pengeluaran"
            icon={<Banknote className="w-5 h-5 text-white" />}
            trend="up"
            color="bg-amber-500"
          />

        </div>

        {/* --- Main Bento Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-rows-[auto_auto]">
          
          {/* 1. Daily Recap (Large Card) */}
          <div className="lg:col-span-2 xl:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-500" />
                 Rekap Absensi Hari Ini
               </h3>
               <Link href="/attendance" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
                 Lihat Detail <ChevronRight size={14} />
               </Link>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               <StatusBadge label="Hadir" value={stats.attendance.present} color="green" icon={<UserCheck size={18} />} />
               <StatusBadge label="Belum Absen" value={stats.attendance.notPresent} color="rose" icon={<LogOut size={18} />} />
               <StatusBadge label="Terlambat" value={stats.attendance.late} color="orange" icon={<Clock size={18} />} />
               <StatusBadge label="Izin/Sakit" value={stats.attendance.permit + stats.attendance.sick} color="yellow" icon={<FileText size={18} />} />
               <StatusBadge label="Alpha" value={stats.attendance.alpha} color="red" icon={<Coffee size={18} />} />
               {/* Dinas Luar tidak ada di schema attendance saat ini, gabung ke Permit atau status lain */}
               <StatusBadge label="Total Log" value={stats.attendance.total} color="teal" icon={<Briefcase size={18} />} />
             </div>
          </div>

          {/* 2. Employee Demographics (Medium Card) */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Komposisi Karyawan
            </h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-40 w-full relative">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={employeeStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {employeeStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-gray-100 dark:bg-neutral-800 rounded-full animate-pulse opacity-50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats.employees.total}</span>
                </div>
              </div>
              <div className="flex justify-center flex-wrap gap-3 mt-4">
                {employeeStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.name} ({Math.round((item.value/stats.employees.total)*100)}%)
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Finance Trend (Tetap Mock untuk Demo Visual) */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-500" />
              Tren Penggajian
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">6 Bulan Terakhir (dalam Juta)</p>
            <div className="flex-1 min-h-[160px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salaryTrend}>
                    <defs>
                      <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`Rp ${value} Jt`, 'Total']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSalary)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full bg-gray-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          {/* 4. Department Distribution (List) */}
          <div className="lg:col-span-1 xl:col-span-1 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Departemen</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {departmentData.map((dept, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{dept.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{dept.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${dept.percentage}%`, backgroundColor: dept.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/employees" className="block w-full text-center mt-6 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border border-dashed border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Lihat Semua Departemen
            </Link>
          </div>

          {/* 5. Quick Actions & Pending Tasks */}
          <div className="lg:col-span-2 xl:col-span-3 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
             <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-500" />
                Aksi Cepat & Status
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending Permissions */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Perizinan</span>
                    <span className="bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                      {stats.permissions.pendingCount} Baru
                    </span>
                  </div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-200 mb-3">Menunggu persetujuan Anda</p>
                  <Link href="/permissions" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1">
                    Review Sekarang <ArrowUpRight size={12} />
                  </Link>
                </div>

                {/* Loans Status */}
                <div className="bg-violet-50/50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Pinjaman</span>
                    <span className="bg-white dark:bg-neutral-800 text-violet-600 dark:text-violet-400 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                      {stats.loans.activeCount} Aktif
                    </span>
                  </div>
                  <p className="text-sm text-violet-900 dark:text-violet-200 mb-3">Sisa: {formatShortCurrency(stats.loans.totalOutstanding)}</p>
                  <Link href="/loans" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 flex items-center gap-1">
                    Kelola Pinjaman <ArrowUpRight size={12} />
                  </Link>
                </div>

                {/* System Health / Master Data */}
                <div className="bg-slate-50 dark:bg-neutral-800 rounded-xl p-4 border border-slate-100 dark:border-neutral-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Sistem</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Online</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">Master data terakhir diupdate kemarin.</p>
                  <Link href="/master-data" className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
                    Cek Master Data <ArrowUpRight size={12} />
                  </Link>
                </div>
             </div>
          </div>

        </div>

      </main>
    </div>
  );
}

// --- Components ---

function StatWidget({ title, value, subtext, icon, trend, color }: any) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{value}</h3>
        <div className="flex items-center gap-1.5">
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          <p className="text-xs text-slate-400 dark:text-slate-500">{subtext}</p>
        </div>
      </div>
      <div className={`${color} p-3 rounded-xl shadow-sm`}>
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ label, value, color, icon }: any) {
  const colorStyles: any = {
    green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50",
    yellow: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50",
    teal: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900/50",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50",
  };

  const activeClass = colorStyles[color] || "bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300";

  return (
    <div className={`flex flex-col p-4 rounded-xl border ${activeClass} transition-transform hover:scale-[1.02] cursor-default`}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-1.5 bg-white/60 dark:bg-black/20 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <span className="text-xs font-semibold opacity-90">{label}</span>
    </div>
  );
}