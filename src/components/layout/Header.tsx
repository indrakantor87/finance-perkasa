'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

export default function Header() {
  const [formattedDate, setFormattedDate] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [roleLabel, setRoleLabel] = useState('Admin');

  const fetchUnreadCount = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/notifications', { signal });
      if (res.ok) {
        const data = await res.json();
        const unread = data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setFormattedDate(today.toLocaleDateString('id-ID', dateOptions));
    
    const controller = new AbortController();
    fetchUnreadCount(controller.signal);

    // Listen for updates
    const handleUpdate = () => fetchUnreadCount(controller.signal);
    window.addEventListener('notifications-updated', handleUpdate);
    
    return () => {
      controller.abort();
      window.removeEventListener('notifications-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth');
      if (!stored) return;
      const user = JSON.parse(stored);
      const role = user.role as string | undefined;
      let label = 'User';
      if (role === 'DEVELOPER') label = 'Developer';
      else if (role === 'ADMINISTRATOR') label = 'Administrator';
      else if (role === 'ADMIN') label = 'Admin';
      else if (role === 'EMPLOYEE' || role === 'KARYAWAN') label = 'Karyawan';
      else if (role === 'STAFF') label = 'Staff';
      setRoleLabel(label);
    } catch (e) {
      console.error('Failed to parse auth for header role', e);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-blue-900 dark:bg-slate-900 text-white border-b border-blue-800 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-md print:hidden">
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-full shadow-lg">
          <img src="/uploads/logo-perkasa-new.png" alt="Perkasa Networks" className="w-8 h-8 object-contain scale-110" />
        </div>
        <div>
           <h1 className="text-lg font-bold tracking-tight text-white leading-none">FINANCE PERKASA</h1>
           <p className="text-[10px] text-blue-200 dark:text-slate-400 font-medium tracking-wide">DASHBOARD SYSTEM</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-xs font-semibold text-white min-h-[1rem]">{formattedDate}</span>
          <span className="text-[10px] text-blue-200 dark:text-slate-400">Selamat Datang, {roleLabel}</span>
        </div>
        <Link href="/notifications" className="relative p-2 hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full transition-colors group">
          <Bell className="w-5 h-5 text-blue-200 dark:text-slate-400 group-hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-red-500 ring-2 ring-white dark:ring-slate-900 w-2.5 h-2.5 rounded-full"></span>
          )}
        </Link>
        <div className="pl-6 border-l border-blue-700 dark:border-slate-800">
           <UserMenu />
        </div>
      </div>
    </header>
  );
}
