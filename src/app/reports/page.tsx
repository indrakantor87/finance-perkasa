'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileBarChart, TrendingUp, TrendingDown, Calendar, 
  Download, Printer, DollarSign, Users, PieChart
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Navigation from '@/components/layout/Navigation'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts'

interface SalarySlipData {
  id: string
  employee: {
    name: string
    role: string
    department: string
  }
  salary: {
    base: number
    transport: number
    meal: number
    position: number
    overtime: number
    incentive: number
    bonus: number
    thr: number
    total: number
  }
  deductions: {
    kasbon: number
    late: number
    bpjs: number
    pph21: number
    other: number
    total: number
  }
  netSalary: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SalarySlipData[]>([])

  useEffect(() => {
    fetchData()
  }, [month, year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/salary-slip?month=${month}&year=${year}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch report data', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate Summaries
  const totalExpenditure = data.reduce((sum, item) => sum + item.netSalary, 0)
  const totalEmployees = data.length
  const avgSalary = totalEmployees > 0 ? totalExpenditure / totalEmployees : 0
  const totalDeductions = data.reduce((sum, item) => sum + item.deductions.total, 0)

  // Group by Department
  const deptStats = data.reduce((acc, item) => {
    const dept = item.employee.department || 'Unassigned'
    if (!acc[dept]) {
      acc[dept] = { name: dept, total: 0, count: 0 }
    }
    acc[dept].total += item.netSalary
    acc[dept].count += 1
    return acc
  }, {} as Record<string, { name: string, total: number, count: number }>)

  const chartData = Object.values(deptStats)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <Navigation />

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Laporan & Rekapitulasi</h1>
            <p className="text-gray-500 text-sm">Ringkasan pengeluaran gaji dan statistik bulanan</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <Calendar size={18} className="text-gray-500 ml-2" />
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="p-1 text-sm font-medium focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(0, i).toLocaleDateString('id-ID', { month: 'long' })}
                </option>
              ))}
            </select>
            <span className="text-gray-300">|</span>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="p-1 text-sm font-medium focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <DollarSign size={24} />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp size={12} /> +2.5%
                  </span>
                </div>
                <p className="text-gray-500 text-sm font-medium">Total Pengeluaran Gaji</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalExpenditure)}</h3>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <Users size={24} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">Total Karyawan Digaji</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalEmployees} Orang</h3>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                    <PieChart size={24} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">Rata-rata Gaji</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(avgSalary)}</h3>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                    <TrendingDown size={24} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">Total Potongan</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalDeductions)}</h3>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Pengeluaran per Departemen</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(value) => `${value / 1000000}M`} 
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Distribusi Karyawan</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Rincian Gaji Karyawan</h3>
                <button className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700">
                  <Download size={16} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Nama Karyawan</th>
                      <th className="px-6 py-4">Departemen</th>
                      <th className="px-6 py-4 text-right">Gaji Pokok</th>
                      <th className="px-6 py-4 text-right">Tunjangan</th>
                      <th className="px-6 py-4 text-right">Potongan</th>
                      <th className="px-6 py-4 text-right">Total Terima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.length > 0 ? (
                      data.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{item.employee.name}</td>
                          <td className="px-6 py-4 text-gray-500">{item.employee.department}</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(item.salary.base)}</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(item.salary.total - item.salary.base)}</td>
                          <td className="px-6 py-4 text-right text-red-500">{formatCurrency(item.deductions.total)}</td>
                          <td className="px-6 py-4 text-right font-bold text-blue-600">{formatCurrency(item.netSalary)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Tidak ada data gaji untuk periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
