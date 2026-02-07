'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

export default function Header() {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setFormattedDate(today.toLocaleDateString('id-ID', dateOptions));
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-blue-900 dark:bg-slate-900 text-white border-b border-blue-800 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-md print:hidden">
      <div className="flex items-center gap-3">
        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg">
          <img src="/uploads/logo-perkasa.png" alt="Logo" className="w-6 h-6 object-contain" />
        </div>
        <div>
           <h1 className="text-lg font-bold tracking-tight text-white leading-none">FINANCE PERKASA</h1>
           <p className="text-[10px] text-blue-200 dark:text-slate-400 font-medium tracking-wide">DASHBOARD SYSTEM</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-xs font-semibold text-white min-h-[1rem]">{formattedDate}</span>
          <span className="text-[10px] text-blue-200 dark:text-slate-400">Selamat Datang, Admin</span>
        </div>
        <Link href="/notifications" className="relative p-2 hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full transition-colors group">
          <Bell className="w-5 h-5 text-blue-200 dark:text-slate-400 group-hover:text-white transition-colors" />
          <span className="absolute top-1.5 right-1.5 bg-red-500 ring-2 ring-white dark:ring-slate-900 w-2.5 h-2.5 rounded-full"></span>
        </Link>
        <div className="pl-6 border-l border-blue-700 dark:border-slate-800">
           <UserMenu />
        </div>
      </div>
    </header>
  );
}
