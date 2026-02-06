'use client'

import { Database } from 'lucide-react'
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';

export default function MasterDataPage() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header & Navigation */}
      <Header />
      <Navigation />

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
