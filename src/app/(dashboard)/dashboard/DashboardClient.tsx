'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PieChart, Pie, Cell, AreaChart, Area, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Coffee, ArrowUpRight, 
  ArrowDownRight, Wallet, Briefcase, ChevronRight, AlertTriangle
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

interface RecentNotification {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
}

export default function DashboardClient({ stats }: { stats: DashboardStats | null }) {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null)
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [employeeData, setEmployeeData] = useState<{
    loading: boolean
    attendance: {
      label: string
      checkIn?: string
      checkOut?: string
    }
    loans: {
      pendingCount: number
      activeCount: number
      outstanding: number
      kasbonMonth: number
    }
    permissions: {
      pendingCount: number
      approvedCount: number
      rejectedCount: number
    }
    salary: {
      label: string
      netSalary: number | null
    }
    warningLetters: {
      activeCount: number
      lastLevel: number | null
      lastIssuedAt: string | null
    }
  }>({
    loading: false,
    attendance: { label: 'Belum ada data' },
    loans: { pendingCount: 0, activeCount: 0, outstanding: 0, kasbonMonth: 0 },
    permissions: { pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    salary: { label: 'Belum tersedia', netSalary: null },
    warningLetters: { activeCount: 0, lastLevel: null, lastIssuedAt: null }
  })

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth')
      if (stored) {
        const user = JSON.parse(stored)
        setRole(user.role)
      }
    } catch (e) {
      console.error(e)
    }
  }, []);

  useEffect(() => {
    if (!mounted) return
    if (role !== 'EMPLOYEE' && role !== 'KARYAWAN') return

    let aborted = false
    const controller = new AbortController()

    const fmtTime = (iso: string | null) => {
      if (!iso) return undefined
      const d = new Date(iso)
      if (isNaN(d.getTime())) return undefined
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const isLate = (checkInIso: string | null) => {
      if (!checkInIso) return false
      const checkIn = new Date(checkInIso)
      if (isNaN(checkIn.getTime())) return false
      const WIB_OFFSET = 7 * 60 * 60 * 1000
      const wib = new Date(checkIn.getTime() + WIB_OFFSET)
      const hour = wib.getUTCHours()
      const minute = wib.getUTCMinutes()
      const isShift2 = hour > 17 || (hour === 17 && minute >= 0)
      if (isShift2) return false
      return hour > 8 || (hour === 8 && minute > 0)
    }

    const isoDateOnly = (d: Date) => d.toISOString().split('T')[0]

    const fetchEmployeeDashboard = async () => {
      setEmployeeData(prev => ({ ...prev, loading: true }))
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const monthLabel = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

      try {
        const [attendanceRes, loansRes, permissionsRes, slipsRes1, slipsRes2, warningRes] = await Promise.all([
          fetch(`/api/attendance?date=${encodeURIComponent(isoDateOnly(now))}`, { signal: controller.signal }),
          fetch('/api/loans', { signal: controller.signal }),
          fetch(`/api/permissions?month=${month}&year=${year}`, { signal: controller.signal }),
          fetch(`/api/salary-slip?month=${month}&year=${year}`, { signal: controller.signal }),
          fetch(`/api/salary-slip?month=${prevMonth}&year=${prevYear}`, { signal: controller.signal }),
          fetch('/api/warning-letters', { signal: controller.signal }),
        ])

        const attendanceJson = attendanceRes.ok ? await attendanceRes.json().catch(() => []) : []
        const loansJson = loansRes.ok ? await loansRes.json().catch(() => []) : []
        const permissionsJson = permissionsRes.ok ? await permissionsRes.json().catch(() => []) : []
        const slips1 = slipsRes1.ok ? await slipsRes1.json().catch(() => []) : []
        const slips2 = slipsRes2.ok ? await slipsRes2.json().catch(() => []) : []
        const warningJson = warningRes.ok ? await warningRes.json().catch(() => []) : []

        if (aborted) return

        const attendanceToday = Array.isArray(attendanceJson) && attendanceJson.length > 0 ? attendanceJson[0] : null
        const attendanceLabel = attendanceToday
          ? (() => {
              const rawStatus = String(attendanceToday.status || '').toUpperCase()
              if (rawStatus === 'ALPHA') return 'Alpha'
              if (rawStatus === 'SAKIT' || rawStatus === 'SICK') return 'Sakit'
              if (rawStatus === 'IZIN' || rawStatus === 'PERMIT') return 'Izin'
              if (isLate(attendanceToday.checkIn || null)) return 'Terlambat'
              return 'Hadir'
            })()
          : 'Belum absen'

        const loansArr = Array.isArray(loansJson) ? loansJson : []
        let outstanding = 0
        let activeCount = 0
        let pendingCount = 0
        let kasbonMonth = 0

        for (const loan of loansArr) {
          const status = String(loan.status || '').toUpperCase()
          if (status === 'ACTIVE') activeCount++
          if (status === 'PENDING') pendingCount++

          if (status !== 'REJECTED') {
            const amount = Number(loan.amount || 0)
            const payments = Array.isArray(loan.payments) ? loan.payments : []
            const paid = payments.reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0)
            outstanding += Math.max(0, amount - paid)
          }

          const type = String(loan.type || '').toUpperCase()
          if (type === 'KASBON') {
            const d = new Date(loan.date)
            if (!isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
              kasbonMonth += Number(loan.amount || 0)
            }
          }
        }

        const permsArr = Array.isArray(permissionsJson) ? permissionsJson : []
        const pendingPerm = permsArr.filter((p: any) => String(p.status || '').toUpperCase() === 'PENDING').length
        const approvedPerm = permsArr.filter((p: any) => String(p.status || '').toUpperCase() === 'APPROVED').length
        const rejectedPerm = permsArr.filter((p: any) => String(p.status || '').toUpperCase() === 'REJECTED').length

        const slipsArr1 = Array.isArray(slips1) ? slips1 : []
        const slipsArr2 = Array.isArray(slips2) ? slips2 : []
        const bestSlip = slipsArr1[0] || slipsArr2[0] || null
        const salaryLabel = bestSlip ? `Slip ${bestSlip.month}/${bestSlip.year}` : `Slip ${monthLabel}`
        const netSalary = bestSlip ? Number(bestSlip.netSalary || 0) : null

        const warningArr = Array.isArray(warningJson) ? warningJson : []
        const activeWarnings = warningArr.filter((w: any) => String(w.status || '').toUpperCase() === 'ACTIVE')
        const lastWarning = warningArr[0] || null

        setEmployeeData({
          loading: false,
          attendance: {
            label: attendanceLabel,
            checkIn: fmtTime(attendanceToday?.checkIn || null),
            checkOut: fmtTime(attendanceToday?.checkOut || null),
          },
          loans: {
            pendingCount,
            activeCount,
            outstanding,
            kasbonMonth
          },
          permissions: {
            pendingCount: pendingPerm,
            approvedCount: approvedPerm,
            rejectedCount: rejectedPerm
          },
          salary: {
            label: salaryLabel,
            netSalary
          },
          warningLetters: {
            activeCount: activeWarnings.length,
            lastLevel: lastWarning ? Number(lastWarning.level || 0) : null,
            lastIssuedAt: lastWarning?.issuedDate ? new Date(lastWarning.issuedDate).toLocaleDateString('id-ID') : null
          }
        })
      } catch (err: any) {
        if (aborted || err?.name === 'AbortError') return
        setEmployeeData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchEmployeeDashboard()

    return () => {
      aborted = true
      controller.abort()
    }
  }, [mounted, role])

  useEffect(() => {
    if (!mounted) return;
    let aborted = false
    const controller = new AbortController()

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true)
        const res = await fetch('/api/notifications', { signal: controller.signal })
        if (!res.ok) return
        const data: any[] = await res.json()
        if (aborted) return
        setRecentNotifications(
          (data || []).slice(0, 5).map(n => ({
            id: n.id,
            title: n.title || 'Notifikasi',
            message: n.message || '',
            type: n.type || 'info',
            createdAt: n.createdAt
          }))
        )
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch dashboard notifications', err)
      } finally {
        if (!aborted) {
          setNotificationsLoading(false)
        }
      }
    }

    fetchNotifications()

    return () => {
      aborted = true
      controller.abort()
    }
  }, [mounted]);

  // Fallback if stats failed to load
  if (!stats) {
    return <div className="p-8 text-center text-red-500">Gagal memuat data dashboard.</div>
  }

  // Karyawan View
  if (role === 'EMPLOYEE' || role === 'KARYAWAN') {
    const formatRupiah = (val: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="font-sans text-slate-800 dark:text-slate-100 p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Selamat Datang di Portal Karyawan</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Ringkasan data Anda hari ini.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Absensi Hari Ini</div>
                      <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{employeeData.attendance.label}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {employeeData.attendance.checkIn ? `Masuk ${employeeData.attendance.checkIn}` : 'Masuk -'} • {employeeData.attendance.checkOut ? `Pulang ${employeeData.attendance.checkOut}` : 'Pulang -'}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Pinjaman</div>
                      <Wallet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{employeeData.loans.activeCount} Aktif</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Menunggu {employeeData.loans.pendingCount} • Sisa {formatRupiah(employeeData.loans.outstanding)}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Kasbon Bulan Ini</div>
                      <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{formatRupiah(employeeData.loans.kasbonMonth)}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Total kasbon bulan berjalan</div>
                  </div>

                  <div className="p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Perizinan</div>
                      <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{employeeData.permissions.pendingCount} Menunggu</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Disetujui {employeeData.permissions.approvedCount} • Ditolak {employeeData.permissions.rejectedCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="lg:col-span-2 p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">Notifikasi Terbaru</div>
                      <Link href="/notifications" className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        Lihat semua <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="mt-4 space-y-3">
                      {notificationsLoading ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Memuat notifikasi...</div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Belum ada notifikasi.</div>
                      ) : (
                        recentNotifications.map(n => (
                          <div key={n.id} className="p-3 rounded-lg border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-slate-100 truncate">{n.title}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{n.message}</div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString('id-ID') : ''}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                    <div className="font-semibold text-gray-900 dark:text-slate-100">Ringkasan</div>
                    <div className="p-3 rounded-lg border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Slip Gaji</div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{employeeData.salary.label}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {employeeData.salary.netSalary === null ? 'Belum tersedia' : formatRupiah(employeeData.salary.netSalary)}
                      </div>
                      <div className="mt-2">
                        <Link href="/salary" className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          Buka gaji <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Sanksi & SP</div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{employeeData.warningLetters.activeCount} Aktif</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {employeeData.warningLetters.lastLevel ? `Terakhir SP ${employeeData.warningLetters.lastLevel} • ${employeeData.warningLetters.lastIssuedAt || ''}` : 'Belum ada data'}
                      </div>
                      <div className="mt-2">
                        <Link href="/employees/disciplinary" className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          Buka sanksi <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                     <Link href="/attendance" className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-100 dark:border-blue-800 group">
                        <UserCheck className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300">Absensi Saya</h3>
                     </Link>
                     <Link href="/employees/disciplinary" className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800 group">
                        <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-lg text-red-700 dark:text-red-300">Sanksi & SP</h3>
                     </Link>
                     <Link href="/salary" className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-100 dark:border-emerald-800 group">
                        <Banknote className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">Gaji Saya</h3>
                     </Link>
                     <Link href="/loans" className="p-6 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors border border-violet-100 dark:border-violet-800 group">
                        <Wallet className="w-10 h-10 text-violet-600 dark:text-violet-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-lg text-violet-700 dark:text-violet-300">Pinjaman</h3>
                     </Link>
                     <Link href="/permissions" className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-100 dark:border-indigo-800 group">
                        <FileCheck className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-300">Perizinan</h3>
                     </Link>
                </div>
            </div>
        </div>
    )
  }

  // --- Process Data for Charts ---

  // Employee Status Colors
  const STATUS_COLORS: Record<string, string> = {
    'Tetap': '#3b82f6',
    'Karyawan': '#3b82f6',
    'Kontrak': '#94a3b8',
    'Kontrak 1': '#6366f1',
    'Kontrak 2': '#f97316',
    'Training': '#f59e0b',
    'Probation': '#10b981',
  }
  const STATUS_COLOR_PALETTE = ['#3b82f6', '#10b981', '#f97316', '#6366f1', '#f43f5e', '#14b8a6']

  const employeeStatusData = stats.employees.byStatus.map((s, idx) => ({
    name: s.name,
    value: s.value,
    color: STATUS_COLORS[s.name] || STATUS_COLOR_PALETTE[idx % STATUS_COLOR_PALETTE.length]
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

  const totalPresentToday = stats.attendance.present + stats.attendance.late

  return (
    <div className="font-sans text-slate-800 dark:text-slate-100">
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
            value={totalPresentToday.toString()} 
            subtext={`dari ${stats.employees.total} karyawan (${Math.round(((totalPresentToday / (stats.employees.total || 1)) || 0)*100)}%)`}
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
               <StatusBadge label="Hadir" value={totalPresentToday} color="green" icon={<UserCheck size={18} />} />
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
                      formatter={(value: any) => [`Rp ${value} Jt`, 'Total']}
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

                {/* Recent Activity / Notifications */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Bell className="w-4 h-4 text-amber-500" />
                      Aktivitas Terbaru
                    </span>
                    <Link
                      href="/notifications"
                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Lihat semua
                    </Link>
                  </div>
                  {notificationsLoading ? (
                    <div className="h-16 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                      Memuat aktivitas...
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="h-16 flex items-center text-xs text-slate-400 dark:text-slate-500">
                      Tidak ada notifikasi baru.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {recentNotifications.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          className="border border-dashed border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-gray-50/80 dark:bg-neutral-800/60"
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {n.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
