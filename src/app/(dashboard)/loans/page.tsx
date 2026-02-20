'use client'

import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Search, Trash2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

type Employee = {
  id: string
  name: string
  role: string
  department: string
}

type LoanPayment = {
  id: string
  amount: number
  date: string
  note?: string
}

type Loan = {
  id: string
  amount: number
  monthlyInstallment: number
  description: string
  type: string
  date: string
  employeeId: string
  status: string // ACTIVE, PAID
  employee: Employee
  payments: LoanPayment[]
  createdAt: string
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)

  // Auth State
  const [role, setRole] = useState<string | null>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    monthlyInstallment: '',
    description: '',
    type: 'KASBON',
    date: new Date().toISOString().split('T')[0]
  })

  // Auth & Data Fetching
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, []) // Fetch all initially, then filter

  const fetchData = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const [loansRes, empRes] = await Promise.all([
        fetch('/api/loans', { signal }),
        fetch('/api/employees', { signal })
      ])
      
      if (loansRes.ok) setLoans(await loansRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Failed to fetch data', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter Logic
  const filteredLoans = loans.filter(loan => {
    const matchSearch = loan.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        loan.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchRole = (role === 'EMPLOYEE' || role === 'KARYAWAN') ? loan.employeeId === currentEmployeeId : true
    
    return matchSearch && matchRole
  })

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isEmployeeRole && formData.type === 'PINJAMAN' && currentEmployee && currentEmployeeId) {
      const roleName = (currentEmployee.role || '').toUpperCase()
      let plafon = 2000000
      if (roleName.includes('MANAGER')) {
        plafon = 5000000
      } else if (roleName.includes('SPV') || roleName.includes('SUPERVISOR') || roleName.includes('LEADER')) {
        plafon = 3000000
      }

      const outstandingPinjaman = loans
        .filter(loan => loan.employeeId === currentEmployeeId && loan.type === 'PINJAMAN' && loan.status === 'ACTIVE')
        .reduce((sum, loan) => sum + getRemainingAmount(loan), 0)

      const requestedAmount = parseFloat(formData.amount || '0')

      if (requestedAmount <= 0 || Number.isNaN(requestedAmount)) {
        alert('Jumlah pinjaman tidak valid')
        return
      }

      if (outstandingPinjaman + requestedAmount > plafon) {
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        const plafonLabel = formatter.format(plafon)
        const remainingPlafon = Math.max(0, plafon - outstandingPinjaman)
        const remainingLabel = formatter.format(remainingPlafon)
        alert(`Pengajuan melebihi plafon pinjaman (${plafonLabel}). Sisa plafon Anda: ${remainingLabel}.`)
        return
      }
    }

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        fetchData()
        setFormData({
          employeeId: '',
          amount: '',
          monthlyInstallment: '',
          description: '',
          type: 'KASBON',
          date: new Date().toISOString().split('T')[0]
        })
      } else {
        let message = 'Gagal membuat pinjaman'
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {}
        alert(message)
      }
    } catch (error) {
      console.error('Submit error', error)
      alert('Terjadi kesalahan')
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm('Hapus data pinjaman ini?')) return
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Delete error', error)
    }
  }

  // Helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const getPaidAmount = (loan: Loan) => {
    return loan.payments.reduce((sum, p) => sum + p.amount, 0)
  }

  const getRemainingAmount = (loan: Loan) => {
    return loan.amount - getPaidAmount(loan)
  }

  const isEmployeeRole = role === 'EMPLOYEE' || role === 'KARYAWAN'

  const currentEmployee = isEmployeeRole && currentEmployeeId
    ? employees.find(emp => emp.id === currentEmployeeId) || null
    : null

  const now = new Date()
  const currentMonthIndex = now.getMonth()
  const currentYear = now.getFullYear()

  const currentEmployeeKasbonMonthlyTotal = isEmployeeRole && currentEmployeeId
    ? loans
        .filter(loan => loan.employeeId === currentEmployeeId && loan.type === 'KASBON')
        .filter(loan => {
          const d = new Date(loan.date)
          return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear
        })
        .reduce((sum, loan) => sum + loan.amount, 0)
    : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="text-blue-600" /> {isEmployeeRole ? 'Pinjaman Saya' : 'Manajemen Pinjaman'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEmployeeRole ? 'Lihat dan ajukan pinjaman pribadi Anda' : 'Kelola data pinjaman dan angsuran karyawan'}
          </p>
        </div>
        
        {/* Create / Request Loan */}
        {isEmployeeRole ? (
          <button 
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                employeeId: currentEmployeeId || '',
                type: 'KASBON'
              }))
              setShowModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Ajukan Pinjaman</span>
          </button>
        ) : (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Pinjaman Baru</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Cari karyawan atau keterangan..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
        </div>
        {isEmployeeRole && (
          <div className="text-right text-sm">
            <div className="text-gray-500 dark:text-gray-400">Total Kasbon bulan ini</div>
            <div className="font-semibold text-gray-800 dark:text-slate-100">
              {formatRupiah(currentEmployeeKasbonMonthlyTotal)}
            </div>
          </div>
        )}
      </div>

      {/* Loans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading data...</div>
        ) : filteredLoans.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 flex flex-col items-center gap-3">
                <CreditCard size={48} className="text-gray-300" />
                <p>Belum ada data pinjaman</p>
            </div>
        ) : (
            filteredLoans.map(loan => {
                const paid = getPaidAmount(loan)
                const remaining = getRemainingAmount(loan)
                const progress = Math.min(100, (paid / loan.amount) * 100)
                
                return (
                    <div key={loan.id} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-slate-100">{loan.employee.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{loan.employee.department}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                        {loan.type === 'PINJAMAN' ? 'Pinjaman' : 'Kasbon'}
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            loan.status === 'PAID'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}
                                    >
                                        {loan.status === 'PAID' ? 'Lunas' : 'Aktif'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Total Pinjaman</span>
                                    <span className="font-semibold text-gray-800 dark:text-slate-200">{formatRupiah(loan.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Angsuran/bln</span>
                                    <span className="font-medium text-gray-800 dark:text-slate-200">{formatRupiah(loan.monthlyInstallment)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Sisa</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">{formatRupiah(remaining)}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Terbayar: {Math.round(progress)}%</span>
                                <span>{new Date(loan.date).toLocaleDateString('id-ID')}</span>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                                <button 
                                    onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    {expandedLoanId === loan.id ? 'Tutup Riwayat' : 'Riwayat Bayar'}
                                    {expandedLoanId === loan.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {role !== 'EMPLOYEE' && role !== 'KARYAWAN' && (
                                    <button 
                                        onClick={() => handleDelete(loan.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                        title="Hapus Data"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded Payment History */}
                        {expandedLoanId === loan.id && (
                            <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 border-t border-gray-100 dark:border-neutral-800 animate-in slide-in-from-top-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Riwayat Pembayaran</h4>
                                {loan.payments.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Belum ada pembayaran</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {loan.payments.map(payment => (
                                            <li key={payment.id} className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-300">{new Date(payment.date).toLocaleDateString('id-ID')}</span>
                                                <span className="font-medium text-green-600 dark:text-green-400">{formatRupiah(payment.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )
            })
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Tambah Pinjaman Baru</h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Karyawan</label>
                        {isEmployeeRole ? (
                          <input
                            type="text"
                            disabled
                            value={currentEmployee?.name || 'Profil karyawan belum terhubung'}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200"
                          />
                        ) : (
                          <select 
                              required
                              value={formData.employeeId}
                              onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                              <option value="">-- Pilih Karyawan --</option>
                              {employees.map(emp => (
                                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                          </select>
                        )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Pinjaman</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value,
                            monthlyInstallment: e.target.value === 'PINJAMAN' ? formData.monthlyInstallment : ''
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="KASBON">Kasbon</option>
                        <option value="PINJAMAN">Pinjaman</option>
                      </select>
                    </div>

                    <div className={`grid gap-4 ${formData.type === 'PINJAMAN' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {formData.type === 'PINJAMAN' ? 'Jumlah Pinjaman' : 'Jumlah Kasbon'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                                <input 
                                    type="number"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        {formData.type === 'PINJAMAN' && (
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Angsuran/Bln</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                                  <input 
                                      type="number"
                                      required
                                      value={formData.monthlyInstallment}
                                      onChange={(e) => setFormData({...formData, monthlyInstallment: e.target.value})}
                                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                      placeholder="0"
                                  />
                              </div>
                          </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Pinjaman</label>
                        <input 
                            type="date" 
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan</label>
                        <textarea 
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Contoh: Biaya Rumah Sakit"
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Simpan Data
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
