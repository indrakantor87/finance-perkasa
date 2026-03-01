'use client'

import { Shield, ChevronLeft, Save } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

const JOB_CATEGORIES = [
  'Direktur',
  'General Manager',
  'Manager',
  'SPV',
  'Leader',
  'Staff',
]

export default function JobCategoriesPage() {
  const [allowances, setAllowances] = useState<Record<string, number>>({
    'Direktur': 0,
    'General Manager': 0,
    'Manager': 0,
    'SPV': 0,
    'Leader': 0,
    'Staff': 0
  })
  const [baseSalaries, setBaseSalaries] = useState<Record<string, number>>({
    'Direktur': 0,
    'General Manager': 0,
    'Manager': 0,
    'SPV': 0,
    'Leader': 0,
    'Staff': 0
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/job-categories/allowances')
        if (res.ok) {
          const data = await res.json()
          const map = data?.allowances || {}
          const base = data?.baseSalaries || {}
          setAllowances({
            'Direktur': Number(map['DIREKTUR'] ?? 0),
            'General Manager': Number(map['GENERAL MANAGER'] ?? 0),
            'Manager': Number(map['MANAGER'] ?? 0),
            'SPV': Number(map['SPV'] ?? 0),
            'Leader': Number(map['LEADER'] ?? 0),
            'Staff': Number(map['STAFF'] ?? 0),
          })
          setBaseSalaries({
            'Direktur': Number(base['DIREKTUR'] ?? 0),
            'General Manager': Number(base['GENERAL MANAGER'] ?? 0),
            'Manager': Number(base['MANAGER'] ?? 0),
            'SPV': Number(base['SPV'] ?? 0),
            'Leader': Number(base['LEADER'] ?? 0),
            'Staff': Number(base['STAFF'] ?? 0),
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        allowances: {
          'DIREKTUR': allowances['Direktur'] || 0,
          'GENERAL MANAGER': allowances['General Manager'] || 0,
          'MANAGER': allowances['Manager'] || 0,
          'SPV': allowances['SPV'] || 0,
          'LEADER': allowances['Leader'] || 0,
          'STAFF': allowances['Staff'] || 0
        },
        baseSalaries: {
          'DIREKTUR': baseSalaries['Direktur'] || 0,
          'GENERAL MANAGER': baseSalaries['General Manager'] || 0,
          'MANAGER': baseSalaries['Manager'] || 0,
          'SPV': baseSalaries['SPV'] || 0,
          'LEADER': baseSalaries['Leader'] || 0,
          'STAFF': baseSalaries['Staff'] || 0
        },
      }
      const res = await fetch('/api/job-categories/allowances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        alert('Tersimpan')
      } else {
        const er = await res.json().catch(() => null)
        alert(er?.error || 'Gagal menyimpan')
      }
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
          <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kategori Jabatan
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Master data level jabatan karyawan yang digunakan di seluruh sistem.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                Daftar Kategori Jabatan
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Isi sesuai permintaan: Direktur, General Manager, Manager, SPV, Leader, Staff.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-800 text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tunjangan Default
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gaji Pokok Default
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800">
                {JOB_CATEGORIES.map((name, index) => (
                  <tr key={name}>
                    <td className="px-6 py-3 text-gray-700 dark:text-slate-200">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-900 dark:text-slate-100">
                      {name}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {name === 'Direktur' && 'Top level pengambil keputusan perusahaan.'}
                      {name === 'General Manager' && 'Pengelola unit bisnis atau divisi besar.'}
                      {name === 'Manager' && 'Penanggung jawab tim atau departemen.'}
                      {name === 'SPV' && 'Supervisor, pengawas operasional harian.'}
                      {name === 'Leader' && 'Ketua tim kecil atau shift.'}
                      {name === 'Staff' && 'Staf tetap dengan tanggung jawab utama operasional.'}
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        value={allowances[name] ?? 0}
                        onChange={(e) => setAllowances(a => ({ ...a, [name]: Number(e.target.value || 0) }))}
                        className="w-40 p-2 border rounded text-right bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-slate-100"
                        disabled={loading}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        value={baseSalaries[name] ?? 0}
                        onChange={(e) => setBaseSalaries(a => ({ ...a, [name]: Number(e.target.value || 0) }))}
                        className="w-40 p-2 border rounded text-right bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-slate-100"
                        disabled={loading}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

