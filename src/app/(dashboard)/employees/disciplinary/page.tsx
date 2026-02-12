
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Search, X, AlertTriangle, FileText, MessageCircle } from 'lucide-react';

interface Employee {
  id: string
  name: string
  department: string
  whatsapp?: string | null
}

interface WarningLetter {
  id: string
  employeeId: string
  employee: Employee
  level: number
  reason: string
  description?: string
  issuedDate: string
  validUntil: string
  status: string
}

export default function DisciplinaryPage() {
  const [warningLetters, setWarningLetters] = useState<WarningLetter[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [role, setRole] = useState('')
  const [currentEmployeeId, setCurrentEmployeeId] = useState('')
  
  // WhatsApp Preview State
  const [showWhatsappModal, setShowWhatsappModal] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [selectedPhone, setSelectedPhone] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    level: '1',
    reason: '',
    description: '',
    validUntil: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0] // Default 6 months
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchWarningLetters(controller.signal)
    fetchEmployees(controller.signal)

    // Get auth state
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth')
      if (stored) {
        const user = JSON.parse(stored)
        setRole(user.role)
        setCurrentEmployeeId(user.employeeId)
      }
    } catch (e) {
      console.error(e)
    }
    
    return () => controller.abort()
  }, [])

  const fetchWarningLetters = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const res = await fetch('/api/warning-letters', { signal })
      if (res.ok) {
        const data = await res.json()
        setWarningLetters(data)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Failed to fetch warning letters', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/employees', { signal }) // Fetches all employees
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Failed to fetch employees', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId) return alert('Pilih karyawan')

    try {
      const res = await fetch('/api/warning-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        fetchWarningLetters()
        setFormData({
            employeeId: '',
            level: '1',
            reason: '',
            description: '',
            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
        })
      } else {
        alert('Gagal membuat SP')
      }
    } catch (err) {
      console.error('Error submitting form', err)
      alert('Terjadi kesalahan')
    }
  }

  const filteredData = warningLetters.filter(wl => {
    const matchesSearch = wl.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wl.reason.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesRole = (role === 'EMPLOYEE' || role === 'KARYAWAN') ? wl.employeeId === currentEmployeeId : true
    
    return matchesSearch && matchesRole
  })

  const getLevelColor = (level: number) => {
    switch(level) {
        case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
        case 3: return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800';
    }
  }

  const sendToWhatsapp = (wl: WarningLetter) => {
    if (!wl.employee.whatsapp) {
        alert('Nomor WhatsApp karyawan tidak tersedia');
        return;
    }

    let phone = wl.employee.whatsapp.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
    }
    
    setSelectedPhone(phone);

    const message = `*SURAT PERINGATAN (SP ${wl.level})*\n\n` +
        `Yth. ${wl.employee.name},\n\n` +
        `Sehubungan dengan pelanggaran disiplin kerja, manajemen menerbitkan SP ${wl.level} dengan detail:\n` +
        `* Alasan: ${wl.reason}\n` +
        `* Tanggal: ${new Date(wl.issuedDate).toLocaleDateString('id-ID')}\n` +
        `* Berlaku Sampai: ${new Date(wl.validUntil).toLocaleDateString('id-ID')}\n\n` +
        `Mohon untuk memperhatikan dan memperbaiki kinerja agar lebih baik lagi.\n\n` +
        `Terima kasih,\n` +
        `Management Perkasa Networks`;

    setWhatsappMessage(message);
    setShowWhatsappModal(true);
  }

  const handleSendWhatsapp = () => {
    window.open(`https://wa.me/${selectedPhone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
    setShowWhatsappModal(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            Manajemen Surat Peringatan (SP)
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Kelola sanksi disipliner karyawan</p>
        </div>
        {(!role || (role !== 'EMPLOYEE' && role !== 'KARYAWAN')) && (
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Buat SP Baru
        </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama karyawan atau alasan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Karyawan</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Tingkat</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Alasan</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Tanggal Terbit</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Berlaku Sampai</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                <th className="px-6 py-3 font-semibold text-neutral-600 dark:text-neutral-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8">Loading...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-neutral-500">Tidak ada data SP</td></tr>
              ) : (
                filteredData.map((wl) => (
                  <tr key={wl.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{wl.employee.name}</div>
                      <div className="text-xs text-neutral-500">{wl.employee.department}</div>
                      {wl.employee.whatsapp && (
                          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <MessageCircle size={10} />
                              {wl.employee.whatsapp}
                          </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(wl.level)}`}>
                        SP {wl.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={wl.description || wl.reason}>
                      {wl.reason}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {new Date(wl.issuedDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {new Date(wl.validUntil).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            wl.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}>
                            {wl.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        {wl.employee.whatsapp ? (
                            <button
                                onClick={() => sendToWhatsapp(wl)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-full transition-colors"
                                title="Kirim ke WhatsApp"
                            >
                                <MessageCircle size={18} />
                            </button>
                        ) : (
                            <span className="text-neutral-300 p-2" title="No WhatsApp">-</span>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Buat Surat Peringatan (SP)</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-500 hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Karyawan</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tingkat SP</label>
                <div className="flex gap-4">
                    {[1, 2, 3].map(lvl => (
                        <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="level"
                                value={lvl}
                                checked={formData.level === lvl.toString()}
                                onChange={(e) => setFormData({...formData, level: e.target.value})}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm">SP {lvl}</span>
                        </label>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Alasan Utama</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Contoh: Terlambat > 5x, Alpha 3 hari"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Detail/Keterangan</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Berlaku Sampai</label>
                <input
                  type="date"
                  required
                  value={formData.validUntil}
                  onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Simpan SP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Preview Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Preview Pesan WhatsApp</h2>
              <button onClick={() => setShowWhatsappModal(false)} className="text-neutral-500 hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Edit Pesan</label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1">*Anda bisa mengedit pesan di atas sebelum dikirim.</p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsappModal(false)}
                  className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendWhatsapp}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  Kirim WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
