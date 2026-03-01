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
  machineDevices?: Array<{ name?: string; ip: string; port: number; enabled?: boolean }>
}

export default function ServerConfigPage() {
  const [settings, setSettings] = useState<SystemSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [devices, setDevices] = useState<Array<{ name?: string; ip: string; port: number; enabled?: boolean }>>([])

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
        setDevices(Array.isArray(data.machineDevices) ? data.machineDevices : [])
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
        body: JSON.stringify({ ...settings, machineDevices: devices })
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
              {/* IP/Port tunggal dipindahkan: gunakan daftar perangkat di bawah untuk konfigurasi multi-mesin */}

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

              <div className="pt-4 border-t border-gray-100 dark:border-neutral-800">
                <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-slate-100">Daftar Perangkat Fingerprint</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">IP</th>
                        <th className="px-3 py-2 text-left">Port</th>
                        <th className="px-3 py-2 text-left">Aktif</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((d, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-neutral-700">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={d.name || ''}
                              onChange={e => {
                                const v = e.target.value
                                setDevices(prev => prev.map((x, i) => i === idx ? { ...x, name: v } : x))
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={d.ip}
                              onChange={e => {
                                const v = e.target.value
                                setDevices(prev => prev.map((x, i) => i === idx ? { ...x, ip: v } : x))
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={d.port}
                              onChange={e => {
                                const v = parseInt(e.target.value || '0', 10)
                                setDevices(prev => prev.map((x, i) => i === idx ? { ...x, port: v } : x))
                              }}
                              className="w-28 p-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={d.enabled !== false}
                              onChange={e => {
                                const v = e.target.checked
                                setDevices(prev => prev.map((x, i) => i === idx ? { ...x, enabled: v } : x))
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setDevices(prev => prev.filter((_, i) => i !== idx))}
                              className="px-3 py-1 rounded bg-red-500 text-white text-xs"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                      {devices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                            Belum ada perangkat ditambahkan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setDevices(prev => [...prev, { name: '', ip: '', port: 4370, enabled: true }])}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm hover:bg-gray-200 dark:hover:bg-neutral-700"
                  >
                    Tambah Perangkat
                  </button>
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

