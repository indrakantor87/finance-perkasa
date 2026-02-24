'use client'

import { Server, ChevronLeft, Wifi, Globe, Info } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

interface SystemSetting {
  id: string
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  payrollCutoffDate: number
  defaultWorkDays: number
  machineIp: string
  machinePort: number
}

export default function ServerConfigPage() {
  const [settings, setSettings] = useState<SystemSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchSettings(controller.signal)
    return () => controller.abort()
  }, [])

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/settings', { signal })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      alert('Gagal memuat konfigurasi server')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        alert('Konfigurasi server berhasil disimpan.')
        fetchSettings()
      } else {
        alert('Gagal menyimpan konfigurasi server.')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="font-sans transition-colors duration-300">
      <main className="p-6 max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/master-data"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Master Data</span>
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-200 dark:shadow-orange-900/20">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Konfigurasi Server
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Pengaturan IP & Port mesin fingerprint serta informasi server utama.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                  Koneksi Mesin Fingerprint (ZKTeco)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Data ini dipakai oleh script <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-[11px]">scripts/sync-machine.js</code> untuk menarik log absensi.
                </p>
              </div>
            </div>
          </div>

          {loading || !settings ? (
            <div className="p-6 text-gray-500 dark:text-gray-400 text-sm">
              Memuat konfigurasi server...
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    IP Address Mesin Fingerprint
                  </label>
                  <input
                    type="text"
                    value={settings.machineIp}
                    onChange={e => setSettings({ ...settings, machineIp: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Contoh: <span className="font-mono">192.168.1.50</span> atau IP publik yang terhubung ke mesin.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Port Mesin Fingerprint
                  </label>
                  <input
                    type="number"
                    value={settings.machinePort}
                    onChange={e =>
                      setSettings({ ...settings, machinePort: parseInt(e.target.value || '0', 10) })
                    }
                    className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Default ZKTeco biasanya <span className="font-mono">4370</span>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Domain / Hostname Aplikasi
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {typeof window !== 'undefined' ? window.location.host : 'psb.perkasa.net.id'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Informasi ini hanya untuk referensi, konfigurasi domain utama tetap diatur di
                    panel hosting / Vercel.
                  </p>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2 bg-gray-50 dark:bg-neutral-800/60 p-3 rounded-lg">
                  <Info className="w-4 h-4 mt-0.5 text-orange-500" />
                  <p>
                    Perubahan IP/Port akan langsung digunakan oleh proses sinkronisasi mesin
                    fingerprint berikutnya. Pastikan mesin sudah dikonfigurasi dengan alamat yang
                    sama.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium transition-all ${
                    saving
                      ? 'bg-orange-400 dark:bg-orange-500/60 cursor-wait'
                      : 'bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

