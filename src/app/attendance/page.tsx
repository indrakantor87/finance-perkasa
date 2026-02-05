'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Upload, Search, Filter, CheckCircle, XCircle, AlertCircle, Download
} from 'lucide-react';

interface Attendance {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  overtimeHours: number
  employee: {
    name: string
    role: string
    department: string
  }
}

interface Employee {
  id: string
  name: string
}

// Komponen NavItem agar konsisten
const NavItem = ({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) => (
  <Link 
    href={href}
    className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
      active 
        ? 'border-blue-600 text-blue-700 font-semibold bg-blue-50/50' 
        : 'border-transparent text-gray-500 hover:text-blue-600 hover:bg-gray-50 font-medium'
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
)

export default function AttendancePage() {
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  // Filter State
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchAttendance()
  }, [startDate, endDate, activeCategory])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees') // Fetch all employees for mapping
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Failed to fetch employees', err)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setAttendances(data)
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const dataToExport = filteredAttendances.map(att => ({
      Tanggal: new Date(att.date).toLocaleDateString('id-ID'),
      Nama: att.employee.name,
      Jabatan: att.employee.role,
      Departemen: att.employee.department,
      'Jam Masuk': att.checkIn ? new Date(att.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      'Jam Pulang': att.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      Status: att.status === 'PRESENT' ? 'Hadir' : att.status,
      'Lembur (Jam)': att.overtimeHours
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Absensi")
    XLSX.writeFile(wb, `Absensi_${startDate}_${endDate}.xlsx`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      parseCSV(e.target.files[0])
    }
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      // Asumsi format CSV: Nama, Tanggal(YYYY-MM-DD), Jam Masuk(HH:mm), Jam Pulang(HH:mm)
      // Skip header row 0
      const parsedData = lines.slice(1).map((line, index) => {
        const [name, date, checkIn, checkOut] = line.split(',').map(item => item?.trim())
        if (!name || !date) return null

        // Cari employee ID berdasarkan nama (case insensitive)
        const matchedEmployee = employees.find(emp => emp.name.toLowerCase() === name.toLowerCase())
        
        return {
          id: index,
          employeeName: name,
          employeeId: matchedEmployee?.id || null, // Jika null, user harus manual fix atau error
          date,
          checkIn: checkIn ? `${date}T${checkIn}:00` : null,
          checkOut: checkOut ? `${date}T${checkOut}:00` : null,
          status: 'PRESENT',
          isValid: !!matchedEmployee
        }
      }).filter(Boolean)
      
      setImportPreview(parsedData)
    }
    reader.readAsText(file)
  }

  const handleImportSubmit = async () => {
    setIsImporting(true)
    try {
      // Filter only valid data
      const validData = importPreview.filter(item => item.isValid && item.employeeId).map(item => ({
        employeeId: item.employeeId,
        date: item.date,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        status: item.status
      }))

      if (validData.length === 0) {
        alert('Tidak ada data valid untuk diimport')
        setIsImporting(false)
        return
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData)
      })

      if (res.ok) {
        const result = await res.json()
        alert(`Berhasil mengimport ${result.count} data absensi`)
        setShowImportModal(false)
        setImportFile(null)
        setImportPreview([])
        fetchAttendance()
      } else {
        alert('Gagal mengimport data')
      }
    } catch (err) {
      console.error('Import error', err)
      alert('Terjadi kesalahan saat import')
    } finally {
      setIsImporting(false)
    }
  }

  const filteredAttendances = attendances.filter(att => {
    const matchCategory = activeCategory === 'Semua' || att.employee.department === activeCategory
    const matchSearch = att.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCategory && matchSearch
  })

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
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" active />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Data Absensi</h1>
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
          >
            <Upload size={18} /> Import Data Fingerprint
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex flex-1 gap-4 items-center flex-wrap">
                {/* Date Range Filter */}
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Export Excel
                </button>

                {/* Category Tabs inside Filter */}
                <div className="flex bg-white rounded-lg border p-1">
                  {['Semua', 'Pemasaran & Pelayanan', 'Teknisi', 'Management'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeCategory === cat 
                          ? 'bg-blue-100 text-blue-700 shadow-sm' 
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
             </div>

             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Karyawan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Masuk</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Pulang</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lembur (Jam)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>
                ) : filteredAttendances.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Tidak ada data absensi</td></tr>
                ) : (
                  filteredAttendances.map((att) => (
                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        {new Date(att.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">{att.employee.name}</td>
                      <td className="px-6 py-3 text-gray-500">{att.employee.role}</td>
                      <td className="px-6 py-3 text-green-600 font-medium">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-3 text-red-600 font-medium">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          att.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                          att.status === 'SICK' ? 'bg-yellow-100 text-yellow-700' :
                          att.status === 'PERMIT' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {att.status === 'PRESENT' ? 'Hadir' : att.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium">{att.overtimeHours > 0 ? `${att.overtimeHours} Jam` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Upload className="text-green-600" /> Import Data Fingerprint
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload File CSV</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                    "
                  />
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); /* Logic download template */ }}
                    className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Download Template
                  </a>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Format: Nama Karyawan, Tanggal (YYYY-MM-DD), Jam Masuk (HH:MM), Jam Pulang (HH:MM)
                </p>
              </div>

              {importPreview.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b text-sm font-semibold text-gray-700 flex justify-between">
                    <span>Preview Data ({importPreview.length} baris)</span>
                    <span className="text-xs font-normal text-gray-500">Hanya data valid yang akan diimport</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">In</th>
                          <th className="px-4 py-2">Out</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-4 py-2 flex items-center gap-2">
                              {item.isValid ? <CheckCircle size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}
                              <span className={item.isValid ? '' : 'text-red-600 font-medium'}>{item.employeeName}</span>
                            </td>
                            <td className="px-4 py-2">{item.date}</td>
                            <td className="px-4 py-2">{item.checkIn ? item.checkIn.split('T')[1].substring(0, 5) : '-'}</td>
                            <td className="px-4 py-2">{item.checkOut ? item.checkOut.split('T')[1].substring(0, 5) : '-'}</td>
                            <td className="px-4 py-2">
                              {item.isValid ? (
                                <span className="text-green-600 text-xs">Ready</span>
                              ) : (
                                <span className="text-red-600 text-xs">Name Not Match</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Batal
              </button>
              <button 
                onClick={handleImportSubmit}
                disabled={isImporting || importPreview.filter(i => i.isValid).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? 'Mengimport...' : 'Proses Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
