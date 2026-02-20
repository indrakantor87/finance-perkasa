'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, LogOut, ChevronDown, Shield, Mail, Phone, Calendar, X, Sun, Moon, Monitor, Lock } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employeeProfile, setEmployeeProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isMountedRef = useRef(true)
  const router = useRouter()

  // Ensure hydration match
  useEffect(() => {
    setMounted(true)
    isMountedRef.current = true
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth')
      if (stored) {
        setCurrentUser(JSON.parse(stored))
      } else {
        const cookie = document.cookie.split('; ').find(row => row.startsWith('perkasa-finance-auth='))
        if (cookie) {
          const value = decodeURIComponent(cookie.split('=')[1] || '')
          if (value) {
            setCurrentUser(JSON.parse(value))
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setEmployeeProfile(null)
      return
    }
    const isEmployee = currentUser.role === 'EMPLOYEE' || currentUser.role === 'KARYAWAN'
    const employeeId = currentUser.employeeId
    if (!isEmployee || !employeeId) {
      setEmployeeProfile(null)
      return
    }

    const controller = new AbortController()
    fetch(`/api/employees/${employeeId}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) return null
        return await res.json()
      })
      .then(data => {
        if (!isMountedRef.current) return
        setEmployeeProfile(data)
      })
      .catch(err => {
        if (err && err.name === 'AbortError') return
        console.error('Failed to load employee profile', err)
      })

    return () => {
      controller.abort()
    }
  }, [currentUser])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Konfirmasi password baru tidak cocok')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert('Password berhasil diubah')
        if (isMountedRef.current) {
          setShowPasswordModal(false)
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        }
      } else {
        alert(data.error || 'Gagal mengubah password')
      }
    } catch (error) {
      console.error('Change password error', error)
      alert('Terjadi kesalahan sistem')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="relative" ref={menuRef}>
      <div 
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-semibold text-white">{currentUser?.name || 'User'}</p>
          <p className="text-xs text-blue-200">{currentUser?.role || 'Guest'}</p>
        </div>
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm ring-2 ring-blue-900/20">
          <span className="font-bold">{currentUser?.name?.charAt(0) || 'U'}</span>
        </div>
        <ChevronDown size={16} className={`text-blue-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-gray-100 dark:border-neutral-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 md:hidden">
             <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{currentUser?.name || 'User'}</p>
             <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.role || 'Guest'}</p>
          </div>
          
          <div className="px-2">
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-neutral-800 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg flex items-center gap-3 transition-colors"
              onClick={() => {
                setIsOpen(false)
                setShowProfileModal(true)
              }}
            >
              <User size={18} />
              <span>Profil Saya</span>
            </button>
            
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-neutral-800 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg flex items-center gap-3 transition-colors"
              onClick={() => {
                setIsOpen(false)
                setShowPasswordModal(true)
              }}
            >
              <Lock size={18} />
              <span>Ubah Password</span>
            </button>
            
            <div className="border-t border-gray-100 dark:border-neutral-800 my-1"></div>

            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tema</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-md flex flex-col items-center justify-center gap-1 transition-colors ${
                    theme === 'light' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Sun size={14} />
                  <span className="text-[10px] font-medium">Terang</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-md flex flex-col items-center justify-center gap-1 transition-colors ${
                    theme === 'dark' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Moon size={14} />
                  <span className="text-[10px] font-medium">Gelap</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-1.5 rounded-md flex flex-col items-center justify-center gap-1 transition-colors ${
                    theme === 'system' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Monitor size={14} />
                  <span className="text-[10px] font-medium">Sistem</span>
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-100 dark:border-neutral-800 my-1"></div>
            
            <button 
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 transition-colors"
              onClick={() => {
                setIsOpen(false)
                try {
                  localStorage.removeItem("perkasa-finance-auth")
                  sessionStorage.removeItem("perkasa-finance-auth")
                  document.cookie = "perkasa-finance-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
                } catch (e) {}
                window.location.href = "/"
              }}
            >
              <LogOut size={18} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            {/* Header Background */}
            <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600 relative">
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6 pt-16 relative">
              {/* Avatar */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <div className="w-24 h-24 bg-white dark:bg-neutral-900 p-1 rounded-full shadow-lg">
                  <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-neutral-900">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="mt-8 mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                  {employeeProfile?.name || currentUser?.name || 'User'}
                </h2>
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-medium mt-1">
                  <Shield size={16} />
                  <span>{currentUser?.role || 'Guest'}</span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl">
                  <Mail size={18} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{currentUser?.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl">
                  <Phone size={18} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Telepon</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                      {employeeProfile?.whatsapp || currentUser?.phone || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl">
                  <Calendar size={18} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Bergabung Sejak</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                      {employeeProfile?.joinDate
                        ? new Date(employeeProfile.joinDate).toLocaleDateString('id-ID')
                        : currentUser?.createdAt
                          ? new Date(currentUser.createdAt).toLocaleDateString('id-ID')
                          : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="w-full py-2.5 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Ubah Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Password Lama</label>
                <input 
                  type="password" 
                  required
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="Masukkan password lama"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Password Baru</label>
                <input 
                  type="password" 
                  required
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="Masukkan password baru"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  required
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="Ulangi password baru"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
