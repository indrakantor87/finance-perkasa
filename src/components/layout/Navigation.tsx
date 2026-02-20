'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, LayoutDashboard, UserCheck, Banknote, 
  CreditCard, FileCheck, Database, Settings, FileBarChart, AlertTriangle
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth');
      if (stored) {
        const user = JSON.parse(stored);
        setRole(user.role);
        return;
      }

      const cookie = document.cookie.split('; ').find(row => row.startsWith('perkasa-finance-auth='));
      if (cookie) {
        const value = decodeURIComponent(cookie.split('=')[1] || '');
        if (value) {
          const user = JSON.parse(value);
          setRole(user.role);
        }
      }
    } catch (e) {
      console.error("Error parsing auth", e);
    }
  }, []);

  const allNavItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/dashboard", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <Users size={18} />, label: "Data Karyawan", href: "/employees", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN'] },
    { icon: <AlertTriangle size={18} />, label: "Sanksi", href: "/employees/disciplinary", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <UserCheck size={18} />, label: "Absensi", href: "/attendance", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <Banknote size={18} />, label: "Gaji", href: "/salary", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <FileBarChart size={18} />, label: "Laporan", href: "/reports", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN'] },
    { icon: <CreditCard size={18} />, label: "Pinjaman", href: "/loans", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <FileCheck size={18} />, label: "Perizinan", href: "/permissions", roles: ['DEVELOPER', 'ADMINISTRATOR', 'ADMIN', 'EMPLOYEE', 'KARYAWAN'] },
    { icon: <Database size={18} />, label: "Master Data", href: "/master-data", roles: ['DEVELOPER', 'ADMINISTRATOR'] },
    { icon: <Settings size={18} />, label: "Settings", href: "/settings", roles: ['DEVELOPER', 'ADMINISTRATOR'] },
  ];

  // Filter items based on role
  // If role is null (loading or not logged in), show nothing or minimal? 
  // Ideally we wait for role, but for now default to empty or safe list.
  const navItems = role ? allNavItems.filter(item => item.roles.includes(role)) : [];

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 overflow-x-auto no-scrollbar print:hidden">
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
                  ? 'border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 font-semibold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 rounded-t-lg'
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
