'use client'

import { Shield, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const JOB_CATEGORIES = [
  'Direktur',
  'General Manager',
  'Manager',
  'SPV',
  'Leader',
  'Karyawan',
  'Training',
  'Kontrak'
]

export default function JobCategoriesPage() {
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
                Isi sesuai permintaan: direktur, general manager, manager, spv, leader, karyawan, training, kontrak.
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
                      {name === 'Karyawan' && 'Staf tetap dengan tanggung jawab utama operasional.'}
                      {name === 'Training' && 'Karyawan dalam masa pelatihan / probation.'}
                      {name === 'Kontrak' && 'Karyawan dengan perjanjian kerja waktu tertentu.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

