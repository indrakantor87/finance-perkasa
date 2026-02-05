'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Building, Save, Shield
} from 'lucide-react';

interface SystemSetting {
  id: string
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  payrollCutoffDate: number
  defaultWorkDays: number
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSetting>({
    id: '',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    payrollCutoffDate: 25,
    defaultWorkDays: 26
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        alert('Pengaturan berhasil disimpan!')
        fetchSettings()
      } else {
        alert('Gagal menyimpan pengaturan.')
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
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

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b overflow-x-auto">
        <div className="px-6 flex gap-6 text-sm font-medium min-w-max">
          <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" href="/dashboard" />
          <NavItem icon={<Users size={16} />} label="Data Karyawan" href="/employees" />
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" active />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col md:flex-row">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('company')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'company' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building size={18} /> Profil Perusahaan
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'payroll' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Banknote size={18} /> Pengaturan Gaji
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'account' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Shield size={18} /> Akun & Keamanan
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Memuat pengaturan...</div>
            ) : (
              <form onSubmit={handleSave}>
                {activeTab === 'company' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Profil Perusahaan</h2>
                    
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                        <input
                          type="text"
                          value={settings.companyName}
                          onChange={e => setSettings({...settings, companyName: e.target.value})}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                        <textarea
                          rows={3}
                          value={settings.companyAddress}
                          onChange={e => setSettings({...settings, companyAddress: e.target.value})}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            value={settings.companyPhone}
                            onChange={e => setSettings({...settings, companyPhone: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Resmi</label>
                          <input
                            type="email"
                            value={settings.companyEmail}
                            onChange={e => setSettings({...settings, companyEmail: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'payroll' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Pengaturan Gaji & Absensi</h2>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Settings className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Perubahan pada tanggal Cut-off akan mempengaruhi perhitungan slip gaji bulan berikutnya.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Cut-off Absensi</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">Setiap tanggal</span>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={settings.payrollCutoffDate}
                            onChange={e => setSettings({...settings, payrollCutoffDate: parseInt(e.target.value)})}
                            className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold"
                          />
                          <span className="text-gray-500 text-sm">bulan berjalan</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Absensi akan dihitung mulai dari tanggal {settings.payrollCutoffDate + 1} bulan lalu sampai tanggal {settings.payrollCutoffDate} bulan ini.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hari Kerja Default (per Bulan)</label>
                        <input
                          type="number"
                          value={settings.defaultWorkDays}
                          onChange={e => setSettings({...settings, defaultWorkDays: parseInt(e.target.value)})}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">Digunakan untuk perhitungan pro-rata jika diperlukan.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Akun & Keamanan</h2>
                    
                    <div className="bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-300">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-gray-900 font-medium">Fitur Keamanan</h3>
                      <p className="text-gray-500 text-sm mb-4">Pengaturan password dan hak akses admin akan tersedia pada update berikutnya.</p>
                      <button type="button" disabled className="bg-gray-200 text-gray-400 px-4 py-2 rounded cursor-not-allowed">
                        Ubah Password Admin
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all ${
                      saving ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    <Save size={18} />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 py-4 cursor-pointer border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
