'use client'

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Trigger a custom event to update header badge if needed
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'error': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white dark:bg-slate-800';
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/20';
      default: return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="font-sans transition-colors duration-200">
      {/* Main Content */}
      <main className="p-6 max-w-[1000px] mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifikasi
          </h1>
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            Tandai Semua Dibaca
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-slate-400">Memuat notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <Bell className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tidak ada notifikasi</h3>
            <p className="text-gray-500 dark:text-slate-400">Anda belum memiliki notifikasi terbaru.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${getBgColor(notification.type, notification.isRead)} ${notification.isRead ? 'border-gray-200 dark:border-slate-700' : 'border-blue-200 dark:border-blue-800 shadow-md'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-base font-semibold ${notification.isRead ? 'text-gray-900 dark:text-white' : 'text-blue-900 dark:text-blue-100'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {format(new Date(notification.createdAt), 'd MMM HH:mm', { locale: id })}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${notification.isRead ? 'text-gray-600 dark:text-slate-300' : 'text-blue-800 dark:text-blue-200'}`}>
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 capitalize">
                        {notification.category.replace('_', ' ')}
                      </span>
                      {!notification.isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          Baru
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
