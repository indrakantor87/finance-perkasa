'use client'

import { Database } from 'lucide-react'

export default function MasterDataPage() {
  return (
    <div className="font-sans transition-colors duration-300">
      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-8 rounded-full animate-pulse">
            <Database className="w-20 h-20 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-zinc-100">Fitur Master Data</h1>
            <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20 px-4 py-1 rounded-full inline-block">
              Dalam Pengembangan
            </p>
          </div>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg text-lg leading-relaxed">
            Kami sedang bekerja keras untuk menghadirkan fitur manajemen data master yang komprehensif, aman, dan mudah digunakan.
          </p>
        </div>
      </main>
    </div>
  )
}
