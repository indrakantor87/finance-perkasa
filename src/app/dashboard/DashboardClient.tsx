'use client';

import React from 'react';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
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
    <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
      
      {/* --- Header --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20">
            <img src="/uploads/logo-perkasa.png" alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">FINANCE PERKASA</h1>
             <p className="text-[10px] text-slate-500 font-medium tracking-wide">DASHBOARD SYSTEM</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
            <span className="text-[10px] text-slate-400">Selamat Datang, Admin</span>
          </div>
          <Link href="/notifications" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group">
            <Bell className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
            <span className="absolute top-1.5 right-1.5 bg-red-500 ring-2 ring-white w-2.5 h-2.5 rounded-full"></span>
          </Link>
          <div className="pl-6 border-l border-gray-200">
             <UserMenu />
          </div>
        </div>
      </header>

      {/* --- Navigation Tabs --- */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto no-scrollbar">
        <div className="px-6 flex gap-8 text-sm font-medium min-w-max">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/dashboard" active />
          <NavItem icon={<Users size={18} />} label="Data Karyawan" href="/employees" />
          <NavItem icon={<UserCheck size={18} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={18} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={18} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={18} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={18} />} label="Master Data" href="/master-data" />
          <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
        </div>
      </div>

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
          <div className="lg:col-span-2 xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-500" />
                 Rekap Absensi Hari Ini
               </h3>
               <Link href="/attendance" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Komposisi Karyawan
            </h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-40 w-full relative">
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-700">{stats.employees.total}</span>
                </div>
              </div>
              <div className="flex justify-center flex-wrap gap-3 mt-4">
                {employeeStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.name} ({Math.round((item.value/stats.employees.total)*100)}%)
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Finance Trend (Tetap Mock untuk Demo Visual) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-500" />
              Tren Penggajian
            </h3>
            <p className="text-xs text-slate-500 mb-4">6 Bulan Terakhir (dalam Juta)</p>
            <div className="flex-1 min-h-[160px]">
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
            </div>
          </div>

          {/* 4. Department Distribution (List) */}
          <div className="lg:col-span-1 xl:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-800 mb-4">Departemen</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {departmentData.map((dept, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{dept.name}</span>
                    <span className="text-slate-500">{dept.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${dept.percentage}%`, backgroundColor: dept.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/employees" className="block w-full text-center mt-6 py-2 text-xs font-medium text-slate-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:text-slate-700 transition-colors">
              Lihat Semua Departemen
            </Link>
          </div>

          {/* 5. Quick Actions & Pending Tasks */}
          <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-500" />
                Aksi Cepat & Status
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending Permissions */}
                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Perizinan</span>
                    <span className="bg-white text-indigo-600 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                      {stats.permissions.pendingCount} Baru
                    </span>
                  </div>
                  <p className="text-sm text-indigo-900 mb-3">Menunggu persetujuan Anda</p>
                  <Link href="/permissions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Review Sekarang <ArrowUpRight size={12} />
                  </Link>
                </div>

                {/* Loans Status */}
                <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Pinjaman</span>
                    <span className="bg-white text-violet-600 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                      {stats.loans.activeCount} Aktif
                    </span>
                  </div>
                  <p className="text-sm text-violet-900 mb-3">Sisa: {formatShortCurrency(stats.loans.totalOutstanding)}</p>
                  <Link href="/loans" className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
                    Kelola Pinjaman <ArrowUpRight size={12} />
                  </Link>
                </div>

                {/* System Health / Master Data */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sistem</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-[10px] text-slate-500">Online</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">Master data terakhir diupdate kemarin.</p>
                  <Link href="/master-data" className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1">
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

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`
        flex items-center gap-2 py-4 px-2 cursor-pointer border-b-2 transition-all duration-200
        ${active 
          ? 'border-blue-600 text-blue-700 font-semibold' 
          : 'border-transparent text-slate-500 hover:text-blue-600 hover:bg-slate-50/50 rounded-t-lg'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function StatWidget({ title, value, subtext, icon, trend, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mb-1">{value}</h3>
        <div className="flex items-center gap-1.5">
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          <p className="text-xs text-slate-400">{subtext}</p>
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
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  const activeClass = colorStyles[color] || "bg-gray-50 text-gray-700";

  return (
    <div className={`flex flex-col p-4 rounded-xl border ${activeClass} transition-transform hover:scale-[1.02] cursor-default`}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-1.5 bg-white/60 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <span className="text-xs font-semibold opacity-90">{label}</span>
    </div>
  );
}
