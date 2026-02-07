'use client'

import React, { useState, useEffect } from 'react'
import { Building, Banknote, Shield, Save, Settings, Trash2, Plus, User, Check, X } from 'lucide-react';

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

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

  // User Management State
  const [users, setUsers] = useState<UserData[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ADMIN' })

  useEffect(() => {
    if (activeTab === 'account') {
      fetchUsers()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Mohon lengkapi semua data')
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (res.ok) {
        alert('User berhasil dibuat')
        setShowUserModal(false)
        setNewUser({ name: '', email: '', password: '', role: 'ADMIN' })
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal membuat user')
      }
    } catch (error) {
      console.error('Create user failed', error)
      alert('Terjadi kesalahan')
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchUsers()
      } else {
        alert('Gagal menghapus user')
      }
    } catch (error) {
      console.error('Delete user failed', error)
    }
  }

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
    <div className="font-sans transition-colors duration-300">
      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Pengaturan Sistem</h1>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden min-h-[500px] flex flex-col md:flex-row transition-colors">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 bg-gray-50 dark:bg-neutral-800/50 border-r border-gray-100 dark:border-neutral-800 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('company')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'company' 
                  ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-700 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Building size={18} /> Profil Perusahaan
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'payroll' 
                  ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-700 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Banknote size={18} /> Pengaturan Gaji
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === 'account' 
                  ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-700 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Shield size={18} /> Akun & Keamanan
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500">Memuat pengaturan...</div>
            ) : (
              <form onSubmit={handleSave}>
                {activeTab === 'company' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 border-b dark:border-neutral-800 pb-2 mb-4">Profil Perusahaan</h2>
                    
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Perusahaan</label>
                        <input
                          type="text"
                          value={settings.companyName}
                          onChange={e => setSettings({...settings, companyName: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alamat Lengkap</label>
                        <textarea
                          rows={3}
                          value={settings.companyAddress}
                          onChange={e => setSettings({...settings, companyAddress: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nomor Telepon</label>
                          <input
                            type="text"
                            value={settings.companyPhone}
                            onChange={e => setSettings({...settings, companyPhone: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email Resmi</label>
                          <input
                            type="email"
                            value={settings.companyEmail}
                            onChange={e => setSettings({...settings, companyEmail: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'payroll' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 border-b dark:border-neutral-800 pb-2 mb-4">Pengaturan Gaji & Absensi</h2>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Settings className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700 dark:text-yellow-500">
                            Perubahan pada tanggal Cut-off akan mempengaruhi perhitungan slip gaji bulan berikutnya.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Cut-off Absensi</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-slate-400 text-sm">Setiap tanggal</span>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={settings.payrollCutoffDate}
                            onChange={e => setSettings({...settings, payrollCutoffDate: parseInt(e.target.value)})}
                            className="w-20 p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold transition-colors"
                          />
                          <span className="text-gray-500 dark:text-slate-400 text-sm">bulan berjalan</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Absensi akan dihitung mulai dari tanggal {settings.payrollCutoffDate + 1} bulan lalu sampai tanggal {settings.payrollCutoffDate} bulan ini.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hari Kerja Default (per Bulan)</label>
                        <input
                          type="number"
                          value={settings.defaultWorkDays}
                          onChange={e => setSettings({...settings, defaultWorkDays: parseInt(e.target.value)})}
                          className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Digunakan untuk perhitungan pro-rata jika diperlukan.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2 mb-4">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Manajemen Pengguna</h2>
                      <button 
                        type="button"
                        onClick={() => setShowUserModal(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={16} /> Tambah User
                      </button>
                    </div>

                    <div className="space-y-4">
                      {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-sm transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                              <p className="text-sm text-gray-500 dark:text-slate-400">{user.email} • <span className="text-xs bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-gray-200 dark:border-neutral-700">{user.role}</span></p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}

                      {users.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-dashed border-gray-300 dark:border-neutral-700">
                          Belum ada user terdaftar
                        </div>
                      )}
                    </div>

                    {/* Modal Create User */}
                    {showUserModal && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md p-6 m-4 border border-gray-100 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
                          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-neutral-800 pb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Tambah User Baru</h3>
                            <button type="button" onClick={() => setShowUserModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                              <X size={20} />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Nama Lengkap</label>
                              <input 
                                type="text" 
                                value={newUser.name}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Email</label>
                              <input 
                                type="email" 
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Password</label>
                              <input 
                                type="password" 
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Role</label>
                              <select 
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="STAFF">STAFF</option>
                              </select>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-6">
                              <button 
                                type="button" 
                                onClick={() => setShowUserModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              >
                                Batal
                              </button>
                              <button 
                                type="button" 
                                onClick={handleCreateUser}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Simpan User
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t dark:border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all ${
                      saving ? 'bg-blue-400 dark:bg-blue-500/50 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
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
