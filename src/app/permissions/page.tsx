'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Upload, Search, Filter, 
  CheckCircle, XCircle, AlertCircle, Plus, File, ExternalLink, Download
} from 'lucide-react';

interface Employee {
  id: string
  name: string
  role: string
  department: string
}

interface LeaveRequest {
  id: string
  employeeId: string
  employee: Employee
  type: string
  startDate: string
  endDate: string
  duration: number
  durationUnit: string
  reason: string
  attachment: string | null
  status: string
  createdAt: string
}

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

export default function PermissionsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'SICK',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    duration: 1,
    durationUnit: 'DAYS',
    reason: '',
    attachment: null as File | null
  })

  useEffect(() => {
    fetchEmployees()
    fetchRequests()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
        if (data.length > 0) {
            setFormData(prev => ({ ...prev, employeeId: data[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees', err)
    }
  }

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/permissions')
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (err) {
      console.error('Failed to fetch requests', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, attachment: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let attachmentUrl = null

      // Upload file if exists
      if (formData.attachment) {
        const uploadData = new FormData()
        uploadData.append('file', formData.attachment)
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData
        })
        
        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json()
          attachmentUrl = uploadResult.url
        } else {
            alert('Gagal mengupload dokumen pendukung')
            setSubmitting(false)
            return
        }
      }

      // Submit request
      const payload = {
        ...formData,
        attachment: attachmentUrl
      }

      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert('Pengajuan izin berhasil disimpan')
        setShowModal(false)
        fetchRequests()
        // Reset form
        setFormData({
            employeeId: employees[0]?.id || '',
            type: 'SICK',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            duration: 1,
            durationUnit: 'DAYS',
            reason: '',
            attachment: null
        })
      } else {
        alert('Gagal menyimpan pengajuan izin')
      }
    } catch (err) {
      console.error('Submit error', err)
      alert('Terjadi kesalahan saat menyimpan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengubah status menjadi ${status}?`)) return

    try {
        const res = await fetch(`/api/permissions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        })

        if (res.ok) {
            fetchRequests()
        } else {
            alert('Gagal mengubah status')
        }
    } catch (err) {
        console.error('Update status error', err)
        alert('Terjadi kesalahan')
    }
  }

  const filteredRequests = requests.filter(req => 
    req.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'SICK': return 'Sakit'
          case 'SPECIAL_MARRIAGE': return 'Cuti Menikah'
          case 'SPECIAL_MENSTRUATION': return 'Cuti Haid'
          case 'SPECIAL_BEREAVEMENT': return 'Cuti Duka'
          case 'ANNUAL': return 'Cuti Tahunan'
          default: return type
      }
  }

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'APPROVED': return 'bg-green-100 text-green-700'
          case 'REJECTED': return 'bg-red-100 text-red-700'
          default: return 'bg-yellow-100 text-yellow-700'
      }
  }

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
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" active />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Perizinan & Cuti</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Ajukan Izin Baru
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Filter */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text"
                        placeholder="Cari nama atau jenis izin..."
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
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Pengajuan</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Karyawan</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jenis Izin</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Izin</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durasi</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dokumen</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>
                        ) : filteredRequests.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Tidak ada data perizinan</td></tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                                        {new Date(req.createdAt).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-gray-900">{req.employee.name}</td>
                                    <td className="px-6 py-3 text-gray-700">{getTypeLabel(req.type)}</td>
                                    <td className="px-6 py-3 text-gray-500">
                                        {new Date(req.startDate).toLocaleDateString('id-ID')} - {new Date(req.endDate).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-3 text-gray-700">
                                        {req.duration} {req.durationUnit === 'DAYS' ? 'Hari' : 'Jam'}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                                            {req.status === 'PENDING' ? 'Menunggu' : req.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        {req.attachment ? (
                                            <a href={req.attachment} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                <FileText size={14} /> Lihat
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Tidak ada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        {req.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded" 
                                                    title="Setujui"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded" 
                                                    title="Tolak"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </main>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Formulir Pengajuan Izin</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Karyawan</label>
                    <select 
                        required
                        value={formData.employeeId}
                        onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Izin</label>
                    <select 
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="SICK">Izin Sakit</option>
                        <option value="SPECIAL_MARRIAGE">Cuti Menikah</option>
                        <option value="SPECIAL_MENSTRUATION">Cuti Haid</option>
                        <option value="SPECIAL_BEREAVEMENT">Cuti Duka</option>
                        <option value="ANNUAL">Cuti Tahunan</option>
                        <option value="OTHER">Lainnya</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                        <input 
                            type="date"
                            required
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir</label>
                        <input 
                            type="date"
                            required
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durasi</label>
                        <input 
                            type="number"
                            required
                            min="0.5"
                            step="0.5"
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: parseFloat(e.target.value)})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                        <select 
                            value={formData.durationUnit}
                            onChange={(e) => setFormData({...formData, durationUnit: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="DAYS">Hari</option>
                            <option value="HOURS">Jam</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                    <textarea 
                        required
                        rows={3}
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jelaskan alasan pengajuan izin..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dokumen Pendukung (Opsional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                        <input 
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Upload size={24} />
                            <span className="text-sm">
                                {formData.attachment ? formData.attachment.name : 'Klik atau drag file ke sini (PDF/Foto)'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting ? 'Menyimpan...' : 'Ajukan Izin'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
