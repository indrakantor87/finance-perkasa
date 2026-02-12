'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileCheck, Calendar, User, FileText, CheckCircle, XCircle, 
  Clock, Plus, Trash2, Search, Filter, Download, Paperclip
} from 'lucide-react'

// Types
type Employee = {
  id: string
  name: string
  role: string
  department: string
}

type LeaveRequest = {
  id: string
  employeeId: string
  employee: Employee
  type: string
  startDate: string
  endDate: string
  duration: number
  durationUnit: string
  reason: string
  attachment?: string
  status: string // PENDING, APPROVED, REJECTED
  createdAt: string
}

const PERMISSION_TYPES = [
  { value: 'SICK', label: 'Sakit (Surat Dokter)' },
  { value: 'ANNUAL', label: 'Cuti Tahunan' },
  { value: 'SPECIAL_MARRIAGE', label: 'Izin Menikah' },
  { value: 'SPECIAL_BEREAVEMENT', label: 'Izin Duka Cita' },
  { value: 'SPECIAL_MENSTRUATION', label: 'Cuti Haid' },
  { value: 'OTHER', label: 'Lainnya' }
]

export default function PermissionsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Auth State
  const [role, setRole] = useState<string | null>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'SICK',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    attachment: ''
  })

  // Fetch Data & Auth
  useEffect(() => {
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth')
      if (stored) {
        const user = JSON.parse(stored)
        setRole(user.role)
        setCurrentEmployeeId(user.employeeId)
        // If employee, set default ID in form
        if (user.role === 'EMPLOYEE' || user.role === 'KARYAWAN') {
            setFormData(prev => ({ ...prev, employeeId: user.employeeId }))
        }
      }
    } catch (e) {
      console.error(e)
    }
    
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [])

  const fetchData = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const [reqRes, empRes] = await Promise.all([
        fetch('/api/permissions', { signal }),
        fetch('/api/employees', { signal })
      ])
      
      if (reqRes.ok) setRequests(await reqRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Failed to fetch data', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter Logic
  const filteredRequests = requests.filter(req => {
    const matchEmployee = (role === 'EMPLOYEE' || role === 'KARYAWAN') ? req.employeeId === currentEmployeeId : true
    return matchEmployee
  })

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate duration roughly (days)
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 

    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employeeId: (role === 'EMPLOYEE' || role === 'KARYAWAN') ? currentEmployeeId : formData.employeeId,
          duration: diffDays,
          durationUnit: 'DAYS'
        })
      })

      if (res.ok) {
        setShowModal(false)
        fetchData()
        setFormData({
            employeeId: (role === 'EMPLOYEE' || role === 'KARYAWAN') ? currentEmployeeId || '' : '',
            type: 'SICK',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
            attachment: ''
        })
      }
    } catch (error) {
      console.error('Submit error', error)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/permissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Update status error', error)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm('Hapus data perizinan ini?')) return
    try {
      const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Delete error', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      const data = new FormData()
      data.append('file', file)
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: data })
        if (res.ok) {
            const json = await res.json()
            setFormData(prev => ({ ...prev, attachment: json.url }))
        }
      } catch (error) {
        console.error('Upload error', error)
      }
    }
  }

  // Render Helpers
  const getTypeLabel = (type: string) => PERMISSION_TYPES.find(t => t.value === type)?.label || type
  
  const getStatusColor = (status: string) => {
    switch(status) {
        case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="text-blue-600" /> Perizinan & Cuti
            </h1>
            <p className="text-gray-500 dark:text-slate-400">Manajemen ketidakhadiran dan cuti karyawan</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
            <Plus size={18} /> Ajukan Izin
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Tanggal Pengajuan</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Karyawan</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Jenis Izin</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Periode</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Alasan</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">Status</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {loading ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
                    ) : filteredRequests.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Belum ada data perizinan.</td></tr>
                    ) : (
                        filteredRequests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                                    {new Date(req.createdAt).toLocaleDateString('id-ID')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 dark:text-slate-200">{req.employee?.name}</div>
                                    <div className="text-xs text-gray-500">{req.employee?.department}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700">
                                        {getTypeLabel(req.type)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                                    <div className="flex flex-col text-xs">
                                        <span>{new Date(req.startDate).toLocaleDateString('id-ID')} s/d</span>
                                        <span>{new Date(req.endDate).toLocaleDateString('id-ID')}</span>
                                        <span className="font-semibold text-gray-700 dark:text-slate-300 mt-1">({req.duration} {req.durationUnit})</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <p className="truncate text-gray-600 dark:text-slate-400" title={req.reason}>{req.reason}</p>
                                    {req.attachment && (
                                        <a href={req.attachment} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs mt-1">
                                            <Paperclip size={12} /> Lampiran
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {(req.status === 'PENDING' && role !== 'EMPLOYEE' && role !== 'KARYAWAN') && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(req.id, 'APPROVED')} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Setujui">
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button onClick={() => handleStatusUpdate(req.id, 'REJECTED')} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Tolak">
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(req.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-neutral-800">
                <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50">
                    <h3 className="font-bold text-gray-800 dark:text-slate-100">Form Pengajuan Izin</h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><XCircle size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(role !== 'EMPLOYEE' && role !== 'KARYAWAN') && (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Karyawan</label>
                        <select 
                            required
                            value={formData.employeeId}
                            onChange={e => setFormData({...formData, employeeId: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                        >
                            <option value="">- Pilih Karyawan -</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                            ))}
                        </select>
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Jenis Izin</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                            >
                                {PERMISSION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Lampiran (Opsional)</label>
                            <input 
                                type="file"
                                onChange={handleFileUpload}
                                className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Tanggal Mulai</label>
                            <input 
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Tanggal Selesai</label>
                            <input 
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={e => setFormData({...formData, endDate: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Alasan / Keterangan</label>
                        <textarea 
                            required
                            rows={3}
                            value={formData.reason}
                            onChange={e => setFormData({...formData, reason: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                            placeholder="Jelaskan alasan izin..."
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-neutral-700 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-slate-300 transition-colors">Batal</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">Simpan Pengajuan</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
