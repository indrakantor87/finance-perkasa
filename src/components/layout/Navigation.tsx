'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, LayoutDashboard, UserCheck, Banknote, 
  CreditCard, FileCheck, Database, Settings, FileBarChart
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Users size={18} />, label: "Data Karyawan", href: "/employees" },
    { icon: <UserCheck size={18} />, label: "Absensi", href: "/attendance" },
    { icon: <Banknote size={18} />, label: "Gaji", href: "/salary" },
    { icon: <FileBarChart size={18} />, label: "Laporan", href: "/reports" },
    { icon: <CreditCard size={18} />, label: "Pinjaman", href: "/loans" },
    { icon: <FileCheck size={18} />, label: "Perizinan", href: "/permissions" },
    { icon: <Database size={18} />, label: "Master Data", href: "/master-data" },
    { icon: <Settings size={18} />, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 overflow-x-auto no-scrollbar print:hidden">
      <div className="px-6 flex gap-8 text-sm font-medium min-w-max">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`
                flex items-center gap-2 py-4 px-2 cursor-pointer border-b-2 transition-all duration-200
                ${isActive 
                  ? 'border-blue-600 text-blue-700 font-semibold' 
                  : 'border-transparent text-slate-500 hover:text-blue-600 hover:bg-slate-50/50 rounded-t-lg'
                }
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
