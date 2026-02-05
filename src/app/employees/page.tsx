'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Plus, Edit, Trash2, Search, X
} from 'lucide-react';

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
  'Pemasaran & Pelayanan': [
    'SPV Penjualan', 
    'Penjualan', 
    'Penjualan & Event', 
    'Creator Digital'
  ],
  'Teknisi': [
    'Leader NOC',
    'Teknisi PSB', 
    'Teknisi Expan / jalur', 
    'Teknisi Jointer',
    'Staff NOC',
    'Support Troubleshoot'
  ],
  'Support Management': [
    'SPV GA',
    'Admin CS', 
    'Staff Finance', 
    'Staff GA', 
    'Kepala Toko', 
    'Store Crew'
  ],
  'Management': [
    'General Manager', 
    'Manager Pemasaran & Pelayanan', 
    'Manager Operasional',
    'Manager Teknik',
    'Manager Finance & HRD'
  ]
}

export default function EmployeesPage() {
  const [activeCategory, setActiveCategory] = useState('Pemasaran & Pelayanan')
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
    department: 'Pemasaran & Pelayanan',
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
    console.log('Submitting form data:', formData) // Debug log

    try {
      const url = formData.id ? `/api/employees/${formData.id}` : '/api/employees'
      const method = formData.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      console.log('Response:', data)

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
      status: '',
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
          <NavItem icon={<Users size={16} />} label="Data Karyawan" href="/employees" active />
          <NavItem icon={<UserCheck size={16} />} label="Absensi" href="/attendance" />
          <NavItem icon={<Banknote size={16} />} label="Gaji" href="/salary" />
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Data Karyawan</h1>
          <button 
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-[#6b2c91] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-800 transition-colors"
          >
            <Plus size={18} /> Tambah
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Category Tabs */}
          <div className="flex border-b border-gray-200">
            {['Pemasaran & Pelayanan', 'Teknisi', 'Support Management', 'Management'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition-colors border-b-2 ${
                  activeCategory === category
                    ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                    : 'border-transparent text-gray-500 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-1 gap-4 items-center flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <select 
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Semua Jabatan</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Semua Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div className="text-sm text-gray-500 whitespace-nowrap">
              Total: <strong>{filteredEmployees.length}</strong> Pegawai
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Bergabung</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Identitas</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Tidak ada data pegawai.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{emp.name}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.status === 'Karyawan' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {emp.identityPhoto ? (
                          <button 
                            onClick={() => setSelectedImage(emp.identityPhoto || null)}
                            className="text-blue-600 hover:text-blue-800 underline font-medium text-sm transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No IMG</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(emp)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">{formData.id ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-black font-medium"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Jabatan (Role)</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${formData.role ? 'text-black font-semibold' : 'text-gray-400'}`}
                  >
                    <option value="" disabled className="text-gray-400">- Pilih Jabatan -</option>
                    {ROLE_OPTIONS[formData.department]?.map(role => (
                      <option key={role} value={role} className="text-black font-semibold">{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Divisi</label>
                  <input
                    type="text"
                    value={formData.department}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${formData.status ? 'text-black font-semibold' : 'text-gray-400'}`}
                  >
                    <option value="" disabled className="text-gray-400">- Pilih Status -</option>
                    {['Teknisi', 'Support Management', 'Management'].includes(formData.department) ? (
                      <>
                        <option value="Kontrak 1" className="text-black font-semibold">Kontrak 1</option>
                        <option value="Kontrak 2" className="text-black font-semibold">Kontrak 2</option>
                        <option value="Karyawan" className="text-black font-semibold">Karyawan</option>
                      </>
                    ) : (
                      <>
                        <option value="Training 1" className="text-black font-semibold">Training 1</option>
                        <option value="Training 2" className="text-black font-semibold">Training 2</option>
                        <option value="Karyawan" className="text-black font-semibold">Karyawan</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Bergabung</label>
                <input
                  type="date"
                  required
                  value={formData.joinDate}
                  onChange={e => setFormData({...formData, joinDate: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:outline-none text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Foto Identitas</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100"
                  />
                  {formData.identityPhoto && (
                    <img 
                      src={formData.identityPhoto} 
                      alt="Preview" 
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#6b2c91] text-white rounded hover:bg-purple-800 font-medium"
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
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full backdrop-blur-md"
            >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Hapus Pegawai?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin menghapus data pegawai ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, id: null })}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
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

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 py-4 cursor-pointer border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
