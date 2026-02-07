'use client'
 
import React, { useState, useEffect } from 'react'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Plus, Edit, Trash2, Search, X, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Employee {
  id: string
  name: string
  role: string
  department: string
  status: string
  joinDate: string
  baseSalary: number
  positionAllowance: number
  identityPhoto?: string
}

const ROLE_OPTIONS: Record<string, string[]> = {
  'Pemasaran dan Pelayanan': [
    'Manager Pemasaran & Pelayanan',
    'SPV Penjualan', 
    'Penjualan', 
    'Penjualan & Event', 
    'Creator Digital',
    'Admin CS'
  ],
  'Operasional': [
    'Manager Operasional',
    'Kepala Toko', 
    'Store Crew'
  ],
  'General Affair': [
    'SPV GA',
    'Staff GA'
  ],
  'Keuangan dan HR': [
    'Manager Finance & HRD',
    'Staff Finance'
  ],
  'Teknis dan Expan': [
    'Manager Teknik',
    'Teknisi PSB', 
    'Teknisi Expan / jalur', 
    'Teknisi Jointer'
  ]
}

export default function EmployeesPage() {
  const [activeCategory, setActiveCategory] = useState('Pemasaran dan Pelayanan')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: string | null}>({ show: false, id: null })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'Penjualan',
    department: 'Pemasaran dan Pelayanan',
    status: 'Karyawan',
    joinDate: new Date().toISOString().split('T')[0],
    baseSalary: 0,
    positionAllowance: 0,
    identityPhoto: ''
  })

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees?department=${encodeURIComponent(activeCategory)}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Failed to fetch employees', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
    setFormData(prev => ({ 
      ...prev, 
      department: activeCategory,
      role: ROLE_OPTIONS[activeCategory]?.[0] || ''
    }))
    setFilterRole('')
    setFilterStatus('')
  }, [activeCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = formData.id ? `/api/employees/${formData.id}` : '/api/employees'
      const method = formData.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        setShowModal(false)
        fetchEmployees()
        resetForm()
        alert(formData.id ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan')
      } else {
        console.error('Server error:', data)
        alert('Gagal menyimpan data: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Failed to save employee', err)
      alert('Terjadi kesalahan saat menyimpan data.')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteModal({ show: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteModal.id) return

    try {
      const res = await fetch(`/api/employees/${deleteModal.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEmployees()
        setDeleteModal({ show: false, id: null })
      }
    } catch (err) {
      console.error('Failed to delete employee', err)
    }
  }

  const handleEdit = (emp: Employee) => {
    setFormData({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      status: emp.status || 'Karyawan',
      joinDate: new Date(emp.joinDate).toISOString().split('T')[0],
      baseSalary: emp.baseSalary,
      positionAllowance: emp.positionAllowance,
      identityPhoto: emp.identityPhoto || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      role: '',
      department: activeCategory,
      status: 'Karyawan',
      joinDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
      positionAllowance: 0,
      identityPhoto: ''
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal 2MB.')
        e.target.value = ''
        return
      }

      const data = new FormData()
      data.append('file', file)

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: data
        })
        if (res.ok) {
          const result = await res.json()
          setFormData(prev => ({ ...prev, identityPhoto: result.url }))
        }
      } catch (err) {
        console.error('Upload failed', err)
      }
    }
  }

  const uniqueRoles = Array.from(new Set(employees.map(emp => emp.role))).filter(Boolean)
  const uniqueStatuses = Array.from(new Set(employees.map(emp => emp.status))).filter(Boolean)

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole ? emp.role === filterRole : true
    const matchesStatus = filterStatus ? emp.status === filterStatus : true
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/employees') // Fetch all employees without filter
      if (!res.ok) throw new Error('Failed to fetch data')
      
      const data = await res.json()
      
      // Transform data for Excel
      const excelData = data.map((emp: Employee, index: number) => ({
        'No': index + 1,
        'Nama Lengkap': emp.name,
        'Jabatan': emp.role,
        'Divisi': emp.department,
        'Status': emp.status,
        'Tanggal Bergabung': new Date(emp.joinDate).toLocaleDateString('id-ID'),
        'Gaji Pokok': emp.baseSalary,
        'Tunjangan Jabatan': emp.positionAllowance
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Auto-width columns
      const colWidths = [
        { wch: 5 },  // No
        { wch: 25 }, // Nama
        { wch: 20 }, // Jabatan
        { wch: 20 }, // Divisi
        { wch: 15 }, // Status
        { wch: 20 }, // Join Date
        { wch: 15 }, // Gaji
        { wch: 15 }  // Tunjangan
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan')
      XLSX.writeFile(wb, `Data_Karyawan_PSB_Perkasa_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Gagal mengexport data ke Excel')
    }
  }

  return (
    <div className="font-sans">
      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Data Karyawan</h1>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={18} /> Export Excel
            </button>
            <button 
              onClick={() => { resetForm(); setShowModal(true) }}
              className="bg-[#6b2c91] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-800 transition-colors shadow-sm"
            >
              <Plus size={18} /> Tambah
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors duration-300">
          {/* Category Tabs */}
          <div className="flex border-b border-gray-200 dark:border-neutral-800 overflow-x-auto">
            {Object.keys(ROLE_OPTIONS).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex-shrink-0 px-6 py-4 text-center text-sm font-semibold tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                  activeCategory === category
                    ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/30 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors">
            <div className="flex flex-1 gap-4 items-center flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm placeholder-gray-500 dark:placeholder-slate-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-neutral-900 transition-colors"
                />
              </div>

{/* Filters removed */}
            </div>
            
            <div className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
              Total: <strong className="text-gray-900 dark:text-slate-200">{filteredEmployees.length}</strong> Pegawai
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal Bergabung</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Identitas</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">Memuat data...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">Tidak ada data pegawai.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-slate-200">{emp.name}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-slate-400">
                        {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          emp.status === 'Karyawan' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800/50' 
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/50'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {emp.identityPhoto ? (
                          <button 
                            onClick={() => setSelectedImage(emp.identityPhoto || null)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium text-sm transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600 text-xs italic">No IMG</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(emp)}
                            className="p-2 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            title="Hapus"
                          >
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
      </main>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-neutral-800 transition-all">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
              <h3 className="font-bold text-gray-800 dark:text-slate-100">{formData.id ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Jabatan (Role)</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className={`w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${formData.role ? 'text-gray-900 dark:text-slate-100 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}
                  >
                    <option value="" disabled className="text-gray-400 dark:text-slate-500">- Pilih Jabatan -</option>
                    {ROLE_OPTIONS[formData.department]?.map(role => (
                      <option key={role} value={role} className="text-gray-900 dark:text-slate-100 font-semibold">{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Divisi</label>
                  <input
                    type="text"
                    value={formData.department}
                    disabled
                    className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400 transition-colors"
                  />
                </div>
              </div>

              {['Operasional', 'General Affair', 'Keuangan dan HR', 'Teknis dan Expan'].includes(formData.department) && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Status Karyawan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                  >
                    <option value="Kontrak 1">Kontrak 1</option>
                    <option value="Kontrak 2">Kontrak 2</option>
                    <option value="Karyawan">Karyawan</option>
                  </select>
                </div>
              )}

              {formData.department === 'Pemasaran dan Pelayanan' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Status Karyawan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors"
                  >
                    <option value="Training 1">Training 1</option>
                    <option value="Training 2">Training 2</option>
                    <option value="Karyawan">Karyawan</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Tanggal Bergabung</label>
                <input
                  type="date"
                  required
                  value={formData.joinDate}
                  onChange={e => setFormData({...formData, joinDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Foto Identitas</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 dark:text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300
                      hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
                  />
                  {formData.identityPhoto && (
                    <img 
                      src={formData.identityPhoto} 
                      alt="Preview" 
                      className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-neutral-700"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#6b2c91] hover:bg-purple-800 text-white rounded font-medium transition-colors shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full backdrop-blur-md">
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Identity Full View" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center border border-gray-100 dark:border-neutral-800 transition-colors">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">Hapus Pegawai?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
              Apakah Anda yakin ingin menghapus data pegawai ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, id: null })}
                className="flex-1 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors shadow-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
