'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Plus, Trash2, Search, X, Eye, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface Employee {
  id: string
  name: string
  role: string
  department: string
}

interface LoanPayment {
  id: string
  amount: number
  date: string
  note?: string
}

interface Loan {
  id: string
  amount: number
  monthlyInstallment: number
  description: string
  date: string
  status: string
  employeeId: string
  employee: Employee
  payments: LoanPayment[]
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

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    monthlyInstallment: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [paymentData, setPaymentData] = useState({
    loanId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  })

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLoans()
    fetchEmployees()
  }, [])

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/loans')
      if (res.ok) {
        const data = await res.json()
        setLoans(data)
      }
    } catch (error) {
      console.error('Error fetching loans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        setFormData({
          employeeId: '',
          amount: '',
          monthlyInstallment: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        })
        fetchLoans()
      }
    } catch (error) {
      console.error('Error creating loan:', error)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/loans/${paymentData.loanId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentData.amount,
          date: paymentData.date,
          note: paymentData.note
        })
      })

      if (res.ok) {
        setShowPaymentModal(false)
        setPaymentData({
          loanId: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          note: ''
        })
        fetchLoans()
      }
    } catch (error) {
      console.error('Error creating payment:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah anda yakin ingin menghapus data pinjaman ini?')) return
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      if (res.ok) fetchLoans()
    } catch (error) {
      console.error('Error deleting loan:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPaidAmount = (payments: LoanPayment[]) => {
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }

  const filteredLoans = loans.filter(loan => 
    loan.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <NavItem icon={<CreditCard size={16} />} label="Pinjaman" href="/loans" active />
          <NavItem icon={<FileCheck size={16} />} label="Perizinan" href="/permissions" />
          <NavItem icon={<Database size={16} />} label="Master Data" href="#" />
          <NavItem icon={<Settings size={16} />} label="Settings" href="/settings" />
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Data Pinjaman</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari karyawan atau keterangan..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus size={18} />
              <span className="font-medium text-sm">Tambah Pinjaman</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Karyawan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pinjaman</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Angsuran/Bulan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Terbayar</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sisa</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                    </tr>
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-gray-500">Belum ada data pinjaman</td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const paidAmount = getPaidAmount(loan.payments)
                      const remaining = loan.amount - paidAmount
                      const isExpanded = expandedLoanId === loan.id

                      return (
                        <React.Fragment key={loan.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(loan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{loan.employee.name}</div>
                              <div className="text-xs text-gray-500">{loan.employee.department}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                              {loan.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(loan.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatCurrency(loan.monthlyInstallment)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {formatCurrency(paidAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                remaining <= 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {remaining <= 0 ? 'Lunas' : 'Aktif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setPaymentData(prev => ({ ...prev, loanId: loan.id, amount: loan.monthlyInstallment.toString() }))
                                    setShowPaymentModal(true)
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Tambah Pembayaran"
                                  disabled={remaining <= 0}
                                >
                                  <Plus size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(loan.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={10} className="px-6 py-4">
                                <div className="ml-10">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Riwayat Pembayaran Angsuran</h4>
                                  {loan.payments.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">Belum ada pembayaran.</p>
                                  ) : (
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-3xl">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Tanggal</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Jumlah</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Catatan</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {loan.payments.map((payment) => (
                                            <tr key={payment.id}>
                                              <td className="px-4 py-2 text-gray-600">
                                                {new Date(payment.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </td>
                                              <td className="px-4 py-2 font-medium text-green-600">
                                                {formatCurrency(payment.amount)}
                                              </td>
                                              <td className="px-4 py-2 text-gray-600">
                                                {payment.note || '-'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

      {/* Add Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">Tambah Pinjaman Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pinjaman</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Pinjaman (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Angsuran per Bulan (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={formData.monthlyInstallment}
                  onChange={(e) => setFormData({ ...formData, monthlyInstallment: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-lg shadow-blue-600/20"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">Input Pembayaran Angsuran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={paymentData.note}
                  onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-sm shadow-lg shadow-green-600/20"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
