'use client'

import { Database, Cpu, ChevronRight, Server, Shield } from 'lucide-react'
import Link from 'next/link'

export default function MasterDataPage() {
  const menus = [
    {
      title: "Manajemen Mesin",
      description: "Kelola user dan data mesin fingerprint (ZKTeco)",
      icon: <Cpu className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      href: "/master-data/machine",
      color: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-100 dark:border-blue-800"
    },
    // Placeholder menus for future master data
    {
      title: "Kategori Jabatan",
      description: "Pengaturan level dan struktur jabatan karyawan",
      icon: <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      href: "#",
      color: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-100 dark:border-purple-800",
      disabled: true
    },
    {
      title: "Konfigurasi Server",
      description: "Pengaturan umum sistem dan environment",
      icon: <Server className="w-8 h-8 text-orange-600 dark:text-orange-400" />,
      href: "#",
      color: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-100 dark:border-orange-800",
      disabled: true
    }
  ];

  return (
    <div className="font-sans transition-colors duration-300">
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data</h1>
            <p className="text-gray-500 dark:text-gray-400">Pusat pengaturan data referensi sistem</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu, index) => (
            <Link 
              key={index} 
              href={menu.href}
              className={`
                group relative p-6 rounded-2xl border transition-all duration-300
                ${menu.disabled 
                  ? 'opacity-60 cursor-not-allowed border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900' 
                  : `bg-white dark:bg-neutral-900 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${menu.borderColor}`
                }
              `}
              onClick={(e) => menu.disabled && e.preventDefault()}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${menu.color} transition-colors group-hover:bg-opacity-80`}>
                  {menu.icon}
                </div>
                {!menu.disabled && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
              
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {menu.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {menu.description}
                </p>
              </div>

              {menu.disabled && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                  Segera
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
