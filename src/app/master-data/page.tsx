'use client'

import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Banknote, 
  CreditCard, 
  FileCheck, 
  Database, 
  Settings,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

const NavItem = ({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) => (
  <Link 
    href={href}
    className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
      active 
        ? 'border-blue-600 text-blue-700 font-semibold bg-blue-50/50' 
        : 'border-transparent text-gray-500 hover:text-blue-600 hover:bg-gray-50 font-medium'
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
)

export default function MasterDataPage() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-full">
            <img src="/uploads/logo-perkasa.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">FINANCE PERKASA</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative block">
            <Bell className="w-5 h-5 cursor-pointer hover:text-gray-200" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] w-4 h-4 flex items-center justify-center rounded-full">3</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      {/* Secondary Navigation (Tabs) */}
      <div className="bg-white shadow-sm border-b overflow-x-auto">
        <div className="px-6 flex gap-6 text-sm font-medium min-w-max">
          <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" href="/dashboard" />
          <NavItem icon={<Users size={16} />} label="Data Karyawan" href="/employees" />
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="/master-data" active />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="bg-blue-100 p-8 rounded-full animate-pulse">
            <Database className="w-20 h-20 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">Fitur Master Data</h1>
            <p className="text-xl text-blue-600 font-semibold bg-blue-50 px-4 py-1 rounded-full inline-block">
              Dalam Pengembangan
            </p>
          </div>
          <p className="text-gray-500 max-w-lg text-lg leading-relaxed">
            Kami sedang bekerja keras untuk menghadirkan fitur manajemen data master yang komprehensif, aman, dan mudah digunakan.
          </p>
        </div>
      </main>
    </div>
  )
}
