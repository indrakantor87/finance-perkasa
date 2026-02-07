'use client'

import React, { useState, useEffect } from 'react'
import { SalarySlip, type SalarySlipData } from '@/components/SalarySlip'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Edit, Printer, X, Save, Trash2, FileSpreadsheet
} from 'lucide-react';
import ExcelJS from 'exceljs';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';

interface SlipHistoryItem extends SalarySlipData {
  id: string
  month: number
  year: number
  createdAt: string
  employee: {
    name: string
    role: string
    department: string
  }
}

export default function SalaryPage() {
  const [activeCategory, setActiveCategory] = useState('Pemasaran dan Pelayanan')
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // History List State
  const [slips, setSlips] = useState<SlipHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Bulk Print State
  const [selectedSlipIds, setSelectedSlipIds] = useState<string[]>([])
  const [showBulkPreview, setShowBulkPreview] = useState(false)
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<SlipHistoryItem | null>(null)

  // Input Modal State
  const [showInputModal, setShowInputModal] = useState(false)
  const [inputData, setInputData] = useState<SalarySlipData & { employee?: { name: string, role: string } } | null>(null)

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const getRoleLabel = (role: string) => {
    if (activeCategory === 'Pemasaran dan Pelayanan') {
      const r = role ? role.toUpperCase() : ''
      if (r === 'MANAGER') return 'PEMASARAN MANAGER'
      if (r === 'LEADER') return 'PEMASARAN LEADER'
      return 'PEMASARAN'
    }
    return role
  }

  // Filter slips based on active category
  const filteredSlips = slips.filter(slip => {
    return slip.employee.department === activeCategory
  })

  const fetchSlips = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/salary-slip?month=${month}&year=${year}`)
      if (res.ok) {
        const data = await res.json()
        setSlips(data)
      }
    } catch (err) {
      console.error('Failed to fetch history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchSlips()
    setSelectedSlipIds([]) // Reset selection on period change
  }, [month, year])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSlipIds(filteredSlips.map(s => s.id))
    } else {
      setSelectedSlipIds([])
    }
  }

  const handleSelectSlip = (id: string) => {
    setSelectedSlipIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleExportExcel = async () => {
    const slipsToExport = selectedSlipIds.length > 0 
      ? slips.filter(s => selectedSlipIds.includes(s.id))
      : filteredSlips;
    
    if (slipsToExport.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Slip Gaji');

    // Fetch images
    let headerLogoId: number | null = null;
    let ttdLogoId: number | null = null;

    try {
        const headerResponse = await fetch('/images/header-banner.png');
        if (headerResponse.ok) {
            const headerBuffer = await headerResponse.arrayBuffer();
            headerLogoId = workbook.addImage({
                buffer: headerBuffer,
                extension: 'png',
            });
        }

        const ttdResponse = await fetch('/images/ttd.png');
        if (ttdResponse.ok) {
            const ttdBuffer = await ttdResponse.arrayBuffer();
            ttdLogoId = workbook.addImage({
                buffer: ttdBuffer,
                extension: 'png',
            });
        }
    } catch (e) {
        console.error("Error loading images", e);
    }

    let colOffset = 1;

    for (const slip of slipsToExport) {
        const col1 = colOffset;
        const col2 = colOffset + 1;

        // Set width
        sheet.getColumn(col1).width = 30;
        sheet.getColumn(col2).width = 20;
        // Set spacer column width
        sheet.getColumn(colOffset + 2).width = 2;

        // --- Header Image ---
        sheet.mergeCells(1, col1, 4, col2);
        if (headerLogoId !== null) {
            sheet.addImage(headerLogoId, {
                tl: { col: col1 - 1, row: 0 },
                br: { col: col2, row: 4 }
            } as any);
        }

        // --- Title ---
        const titleRow = 5;
        sheet.mergeCells(titleRow, col1, titleRow, col2);
        const titleCell = sheet.getCell(titleRow, col1);
        titleCell.value = 'SLIP GAJI';
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { bold: true, size: 12, name: 'Times New Roman' };
        titleCell.border = { bottom: { style: 'double' } };

        // --- Info Karyawan ---
        let currentRow = 7;
        const addInfo = (label: string, value: string) => {
            const c1 = sheet.getCell(currentRow, col1);
            c1.value = label;
            c1.font = { name: 'Times New Roman', bold: true };
            
            const c2 = sheet.getCell(currentRow, col2);
            c2.value = `: ${value}`;
            c2.font = { name: 'Times New Roman', bold: true };
            
            currentRow++;
        };

        const monthName = new Date(slip.year, slip.month - 1).toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        addInfo('Bulan', monthName);
        addInfo('Nama', slip.employee.name);
        addInfo('Bagian', slip.employee.role);

        currentRow++; // Spacer

        // --- Table Header ---
        const headerRow = currentRow;
        const h1 = sheet.getCell(headerRow, col1);
        h1.value = 'Penghasilan';
        h1.alignment = { horizontal: 'center' };
        h1.font = { bold: true, name: 'Times New Roman' };
        h1.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

        const h2 = sheet.getCell(headerRow, col2);
        h2.value = 'Rincian';
        h2.alignment = { horizontal: 'center' };
        h2.font = { bold: true, name: 'Times New Roman' };
        h2.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

        currentRow++;

        // --- Table Content ---
        const addRow = (label: string, value: number | string | null | undefined, isCurrency = true) => {
             const c1 = sheet.getCell(currentRow, col1);
             c1.value = label;
             c1.font = { name: 'Times New Roman' };
             c1.border = { left: { style: 'medium' }, right: { style: 'medium' } };

             const c2 = sheet.getCell(currentRow, col2);
             if (value !== null && value !== undefined) {
                 c2.value = value;
                 if (typeof value === 'number' && isCurrency) {
                    c2.numFmt = '"Rp" #,##0';
                 }
             }
             c2.font = { name: 'Times New Roman' };
             c2.border = { left: { style: 'medium' }, right: { style: 'medium' } };
             
             currentRow++;
        };
        
        const isMarketing = slip.employee.department === 'Penjualan' || slip.employee.department === 'Marketing' || slip.employee.role.includes('MARKETING') || (slip.employee.department && slip.employee.department.toLowerCase().includes('pemasaran'));
        
        if (isMarketing) {
             // Marketing Structure
             if (slip.attendanceAllowance) addRow('Kehadiran Absensi', slip.attendanceAllowance);
             addRow('Gaji', slip.baseSalary);
             if (slip.incentivePsb) addRow(`Incentive PSB ${slip.psbCount || ''}`, slip.incentivePsb);
             if (slip.incentiveInstalasi) addRow('Incentive Instalasi', slip.incentiveInstalasi);
             if (slip.incentiveTagihan) addRow('Incentive Tagihan', slip.incentiveTagihan);
             if (slip.umtAmount) addRow('UMT', slip.umtAmount);
             if (slip.positionAllowance) addRow('Tunjangan Jabatan', slip.positionAllowance);
             if (slip.overtimeAmount) addRow('Overtime + Hari Libur', slip.overtimeAmount);
             if (slip.bpjsAllowance) addRow('Tunjangan Kesehatan/ BPJS Ketenagakerjaan', slip.bpjsAllowance);
             if (slip.transportAmount) addRow('Transport', slip.transportAmount);
             if (slip.disciplineBonus) addRow('Kedisiplinan', slip.disciplineBonus);
        } else {
             // Non-Marketing Structure
             addRow('Kehadiran Absensi', slip.baseSalary);
             if (slip.performanceBonus) addRow('Kinerja', slip.performanceBonus);
             if (slip.disciplineBonus) addRow('Kedisiplinan', slip.disciplineBonus);
             if (slip.transportAmount) addRow('Transport', slip.transportAmount);
             if (slip.mealAllowance) addRow('Uang Makan', slip.mealAllowance);
             if (slip.positionAllowance) addRow('Tunjangan Jabatan', slip.positionAllowance);
             if (slip.overtimeAmount) addRow('Overtime + Hari Libur', slip.overtimeAmount);
             if (slip.bpjsAllowance) addRow('BPJS Ketenagakerjaan', slip.bpjsAllowance);
             
             // Teknisi Specific
             if (slip.newCustomerIncentive) addRow('Pelanggan Baru User', slip.newCustomerIncentive);
             if (slip.clientFee) addRow('Fee Clien 3%', slip.clientFee);
        }

        // NB Row
        const nbRow = currentRow;
        sheet.mergeCells(nbRow, col1, nbRow, col2);
        const nbCell = sheet.getCell(nbRow, col1);
        nbCell.value = 'NB : ...'; 
        nbCell.font = { name: 'Times New Roman', bold: true, size: 10 };
        nbCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
        nbCell.alignment = { wrapText: true };
        currentRow++;

        // JUMLAH
        const jumlahRow = currentRow;
        const j1 = sheet.getCell(jumlahRow, col1);
        j1.value = 'JUMLAH';
        j1.font = { bold: true, name: 'Times New Roman' };
        j1.border = { left: { style: 'medium' }, bottom: { style: 'thin' }, top: { style: 'medium' } };

        const j2 = sheet.getCell(jumlahRow, col2);
        j2.value = slip.totalIncome;
        j2.numFmt = '"Rp" #,##0';
        j2.font = { bold: true, name: 'Times New Roman' };
        j2.border = { right: { style: 'medium' }, bottom: { style: 'thin' }, top: { style: 'medium' }, left: {style: 'medium'} };
        currentRow++;

        // DEDUCTIONS
        if (slip.arisanDeduction > 0) {
            const r = currentRow;
            const c1 = sheet.getCell(r, col1);
            c1.value = 'Arisan';
            c1.font = { bold: true, name: 'Times New Roman' };
            c1.border = { left: { style: 'medium' }, bottom: { style: 'thin' } };
            
            const c2 = sheet.getCell(r, col2);
            c2.value = slip.arisanDeduction;
            c2.numFmt = '"Rp" #,##0';
            c2.font = { bold: true, name: 'Times New Roman' };
            c2.border = { right: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'medium' } };
            currentRow++;
        }

        if (slip.jhtDeduction > 0) {
            const r = currentRow;
            const c1 = sheet.getCell(r, col1);
            c1.value = 'Potongan JHT';
            c1.font = { bold: true, name: 'Times New Roman' };
            c1.border = { left: { style: 'medium' }, bottom: { style: 'thin' } };
            
            const c2 = sheet.getCell(r, col2);
            c2.value = slip.jhtDeduction;
            c2.numFmt = '"Rp" #,##0';
            c2.font = { bold: true, name: 'Times New Roman' };
            c2.border = { right: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'medium' } };
            currentRow++;
        }

        if (slip.loanDeduction > 0) {
            const r = currentRow;
            const c1 = sheet.getCell(r, col1);
            c1.value = 'BON';
            c1.font = { bold: true, name: 'Times New Roman' };
            c1.border = { left: { style: 'medium' }, bottom: { style: 'thin' } };
            
            const c2 = sheet.getCell(r, col2);
            c2.value = slip.loanDeduction;
            c2.numFmt = '"Rp" #,##0';
            c2.font = { bold: true, name: 'Times New Roman' };
            c2.border = { right: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'medium' } };
            currentRow++;
        }

        // TOTAL DITERIMA
        const totalRow = currentRow;
        const t1 = sheet.getCell(totalRow, col1);
        t1.value = 'TOTAL DITERIMA';
        t1.font = { bold: true, name: 'Times New Roman' };
        t1.border = { left: { style: 'medium' }, bottom: { style: 'medium' } };

        const t2 = sheet.getCell(totalRow, col2);
        t2.value = slip.netSalary;
        t2.numFmt = '"Rp" #,##0';
        t2.font = { bold: true, name: 'Times New Roman' };
        t2.border = { right: { style: 'medium' }, bottom: { style: 'medium' }, left: {style: 'medium'} };
        currentRow++;

        // TTD Section
        currentRow++; 
        const ttdRowStart = currentRow;
        
        sheet.mergeCells(ttdRowStart, col1, ttdRowStart, col2);
        const ttdTitle = sheet.getCell(ttdRowStart, col1);
        ttdTitle.value = 'DIREKTUR';
        ttdTitle.alignment = { horizontal: 'center' };
        ttdTitle.font = { bold: true, name: 'Times New Roman' };

        currentRow += 4;
        
        if (ttdLogoId !== null) {
            sheet.addImage(ttdLogoId, {
                tl: { col: col1 + 0.5, row: ttdRowStart + 0.5 }, 
                br: { col: col1 + 1.5, row: currentRow }
            } as any);
        }

        sheet.mergeCells(currentRow, col1, currentRow, col2);
        const ttdName = sheet.getCell(currentRow, col1);
        ttdName.value = 'DARNO';
        ttdName.alignment = { horizontal: 'center' };
        ttdName.font = { bold: true, name: 'Times New Roman', underline: true };

        // Move to next slip
        colOffset += 3;
    }

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Slip_Gaji_Export_${new Date().getTime()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  const handleBulkPrint = () => {
    if (selectedSlipIds.length === 0) return
    setShowBulkPreview(true)
  }
  
  const executeBulkPrint = () => {
    window.print()
  }

  const handleInputRincian = async () => {
    if (!employeeId || !employeeId.trim()) {
      alert('Silakan isi nama karyawan')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Fetch draft/calculated data
      const res = await fetch('/api/salary-slip/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim(), month, year, preview: true }),
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil data')

      // Marketing specific adjustments
      if (activeCategory === 'Pemasaran dan Pelayanan') {
          // Reset standard Transport/Meal to avoid double counting if using UMT
          // But allow them to be used if UMT is just a label? 
          // Since we added umtAmount, we should use that.
          // We'll zero out others to be safe, or user can't see them to change them.
          data.transportAmount = 0
          data.mealAllowance = 0
          // data.performanceBonus = 0 // Keep if Kinerja is different? Image doesn't show Kinerja.
          // Image shows: Incentive PSB, Instalasi, Tagihan.
          // Kinerja might be irrelevant.
          // data.performanceBonus = 0
      }

      setInputData(data)
      setShowInputModal(true)
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSlip = async () => {
    if (!inputData) return
    setLoading(true)
    try {
      const res = await fetch('/api/salary-slip/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employeeId.trim(), 
          month, 
          year, 
          overrides: inputData 
        }),
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan slip gaji')

      setShowInputModal(false)
      fetchSlips() // Refresh list
      
      // Optionally show preview immediately
      // handlePreview({...data, employee: inputData.employee}) 

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(msg) // You might want to show this in the modal
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (slip: SlipHistoryItem) => {
    setSelectedSlip(slip)
    setShowPreview(true)
  }

  const handlePrint = (slip: SlipHistoryItem) => {
    setSelectedSlip(slip)
    setShowPreview(true)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const handleEdit = (slip: SlipHistoryItem) => {
    // Populate form with existing slip data for editing
    setEmployeeId(slip.employee.name) // Note: logic in API uses ID or Name, so Name works if unique
    setMonth(slip.month)
    setYear(slip.year)
    
    // Directly open modal with this slip's data
    setInputData({
        ...slip,
        employee: slip.employee
    })
    setShowInputModal(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    try {
        const res = await fetch(`/api/salary-slip?id=${deleteId}`, {
            method: 'DELETE',
        })

        if (!res.ok) throw new Error('Gagal menghapus slip gaji')

        fetchSlips() // Refresh list
        setShowDeleteModal(false)
        setDeleteId(null)
    } catch (err) {
        console.error(err)
        alert('Gagal menghapus slip gaji')
    }
  }

  const updateInput = (field: keyof SalarySlipData, value: number) => {
    if (!inputData) return
    const newData = { ...inputData, [field]: value }
    
    // Auto-calculate Incentive PSB if psbCount changes
    if (field === 'psbCount') {
        newData.incentivePsb = value * 50000
    }

    // Auto-calculate Incentive Instalasi
    if (field === 'installationCount5k' || field === 'installationCount10k') {
        const count5k = field === 'installationCount5k' ? value : (newData.installationCount5k || 0)
        const count10k = field === 'installationCount10k' ? value : (newData.installationCount10k || 0)
        newData.incentiveInstalasi = (count5k * 5000) + (count10k * 10000)
    }

    // Auto-calculate Gaji (Base Salary) for Marketing based on package counts
    // Only if user changes one of the count fields
    const packageFields = ['countHomeLite', 'countHomeBasic', 'countHomeStream', 'countHomeEntertain', 'countHomeSmall', 'countHomeAdvan']
    if (packageFields.includes(field)) {
        const countHomeLite = field === 'countHomeLite' ? value : (newData.countHomeLite || 0)
        const countHomeBasic = field === 'countHomeBasic' ? value : (newData.countHomeBasic || 0)
        const countHomeStream = field === 'countHomeStream' ? value : (newData.countHomeStream || 0)
        const countHomeEntertain = field === 'countHomeEntertain' ? value : (newData.countHomeEntertain || 0)
        const countHomeSmall = field === 'countHomeSmall' ? value : (newData.countHomeSmall || 0)
        const countHomeAdvan = field === 'countHomeAdvan' ? value : (newData.countHomeAdvan || 0)

        const rawTotal = (countHomeLite * 337800) +
                         (countHomeBasic * 150000) +
                         (countHomeStream * 180180) +
                         (countHomeEntertain * 234234) +
                         (countHomeSmall * 292793) +
                         (countHomeAdvan * 418919)
        
        newData.baseSalary = Math.round(rawTotal * 0.20)
    }

    // Auto-calculate UMT
    if (field === 'presentDays') {
        newData.umtAmount = value * 15000
    }
    
    // Recalculate totals
    const totalIncome = 
      (newData.baseSalary || 0) + 
      (newData.attendanceAllowance || 0) +
      (newData.transportAmount || 0) + 
      (newData.overtimeAmount || 0) + 
      (newData.performanceBonus || 0) + 
      (newData.disciplineBonus || 0) + 
      (newData.positionAllowance || 0) + 
      (newData.bpjsAllowance || 0) + 
      (newData.mealAllowance || 0) +
      (newData.incentivePsb || 0) +
      (newData.incentiveInstalasi || 0) +
      (newData.incentiveTagihan || 0) +
      (newData.umtAmount || 0) +
      (newData.newCustomerIncentive || 0) +
      (newData.clientFee || 0)

    const totalDeduction = 
      (newData.arisanDeduction || 0) + 
      (newData.jhtDeduction || 0) + 
      (newData.loanDeduction || 0)

    setInputData({
      ...newData,
      totalIncome,
      totalDeduction,
      netSalary: totalIncome - totalDeduction
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black font-sans print:bg-white">
      {/* Header & Navigation */}
      <Header />
      <Navigation />

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6 print:p-0 print:max-w-none">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Penggajian & Slip Gaji</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 print:hidden">
          {/* Category Tabs */}
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto pb-2">
            {['Pemasaran dan Pelayanan', 'Teknis dan Expan', 'Operasional', 'General Affair', 'Keuangan dan HR'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`pb-2 px-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeCategory === category
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {['Pemasaran dan Pelayanan', 'Teknis dan Expan', 'Operasional', 'General Affair', 'Keuangan dan HR'].includes(activeCategory) ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nama Karyawan</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder={`contoh: Budi Santoso`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Bulan</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tahun</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <button
                onClick={handleInputRincian}
                disabled={loading || !employeeId}
                className="w-full bg-blue-700 dark:bg-blue-600 text-white py-2 rounded hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 font-bold transition-colors"
              >
                {loading ? 'Memuat...' : 'Input Rincian & Buat Slip'}
              </button>
              
              {error && <p className="text-red-500 mt-4 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 inline-block p-4 rounded-full mb-4 shadow-sm">
                <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">Fitur Belum Tersedia</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Modul penggajian untuk kategori <span className="font-bold text-blue-600 dark:text-blue-400">{activeCategory}</span> sedang dalam pengembangan.
              </p>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden print:hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100">Riwayat Slip Gaji</h2>
             <div className="flex items-center gap-4">
                 <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors font-medium bg-green-600 text-white hover:bg-green-700 shadow-sm"
                 >
                    <FileSpreadsheet size={16} />
                    <span>Export Excel</span>
                 </button>
                 <button 
                    onClick={handleBulkPrint}
                    disabled={selectedSlipIds.length === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors font-medium ${selectedSlipIds.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                 >
                    <Printer size={16} />
                    <span>Print {selectedSlipIds.length > 0 ? `${selectedSlipIds.length} Terpilih` : 'Terpilih'}</span>
                 </button>
                 <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                 <div className="text-sm text-gray-500 dark:text-gray-400">
                    Periode: {new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                 </div>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 w-10">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={filteredSlips.length > 0 && selectedSlipIds.length === filteredSlips.length}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Karyawan</th>
                  <th className="px-6 py-3">Jabatan</th>
                  <th className="px-6 py-3">Total Terima</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Memuat data...</td>
                  </tr>
                ) : filteredSlips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {slips.length === 0 ? 'Belum ada slip gaji untuk periode ini.' : 'Belum ada slip gaji untuk kategori ini.'}
                    </td>
                  </tr>
                ) : (
                  filteredSlips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3">
                        <input 
                            type="checkbox" 
                            checked={selectedSlipIds.includes(slip.id)}
                            onChange={() => handleSelectSlip(slip.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-6 py-3 text-gray-900 dark:text-zinc-100 font-medium">
                        {new Date(slip.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-zinc-100">{slip.employee.name}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{getRoleLabel(slip.employee.role)}</td>
                      <td 
                        className="px-6 py-3 font-medium text-green-600 dark:text-green-400 cursor-pointer hover:text-green-800 dark:hover:text-green-300 hover:underline"
                        onClick={() => handlePreview(slip)}
                        title="Klik untuk lihat detail"
                      >
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(slip.netSalary)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(slip)}
                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(slip.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
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

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col items-center text-center">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                    <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">Hapus Slip Gaji?</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                  Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Print Preview Modal */}
        {showBulkPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm print:bg-white print:static print:h-auto print:w-full print:block print:p-0">
             <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col print:shadow-none print:w-full print:max-w-none print:h-auto print:rounded-none print:block border border-gray-100 dark:border-gray-800">
                {/* Modal Header - Hidden on Print */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 print:hidden shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-zinc-100 text-lg">Preview Cetak Slip Gaji</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSlipIds.length} slip gaji terpilih</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowBulkPreview(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded font-medium"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={executeBulkPrint}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm"
                        >
                            <Printer size={18} />
                            Cetak
                        </button>
                    </div>
                </div>

                {/* Modal Content - Visible on Print */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-black/50 print:bg-white print:p-0 print:overflow-visible print:block">
                    <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4 print:w-full">
                            {slips.filter(s => selectedSlipIds.includes(s.id)).map((slip) => (
                               <div key={slip.id} className="bg-white shadow-sm print:shadow-none print:break-inside-avoid print:page-break-inside-avoid print:border print:border-gray-200">
                                  <div className="transform scale-90 origin-top-left w-[111%] h-[111%] print:transform-none print:w-auto print:h-auto">
                                      <SalarySlip 
                                        data={slip} 
                                        employeeName={slip.employee.name} 
                                        role={slip.employee.role}
                                        department={slip.employee.department}
                                        month={slip.month}
                                        year={slip.year}
                                      />
                                  </div>
                               </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* Input/Edit Modal */}
        {showInputModal && inputData && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl my-8 border border-gray-100 dark:border-gray-800">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100">Rincian Slip Gaji</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {inputData.employee?.name} - {getRoleLabel(inputData.employee?.role || '')}
                  </p>
                </div>
                <button 
                  onClick={() => setShowInputModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 gap-8">
                {/* Penghasilan */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Penghasilan</h4>
                  
                  {activeCategory === 'Pemasaran dan Pelayanan' ? (
                      <>
                        <InputItem label="Kehadiran Absensi" value={inputData.attendanceAllowance || 0} onChange={(v) => updateInput('attendanceAllowance', v)} />
                        <InputItem label="Gaji" value={inputData.baseSalary} onChange={(v) => updateInput('baseSalary', v)} />
                        {/* Package Counts for Gaji Calculation (Optional/Reference) */}
                        <details className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                            <summary className="text-sm font-bold text-blue-800 dark:text-blue-300 cursor-pointer">Kalkulator Gaji Otomatis (Opsional)</summary>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <PackageInput label="Home Lite" price="337.800" value={inputData.countHomeLite} onChange={(v) => updateInput('countHomeLite', v)} />
                                <PackageInput label="Home Basic" price="150.000" value={inputData.countHomeBasic} onChange={(v) => updateInput('countHomeBasic', v)} />
                                <PackageInput label="Home Stream" price="180.180" value={inputData.countHomeStream} onChange={(v) => updateInput('countHomeStream', v)} />
                                <PackageInput label="Home Entertain" price="234.234" value={inputData.countHomeEntertain} onChange={(v) => updateInput('countHomeEntertain', v)} />
                                <PackageInput label="Home Small" price="292.793" value={inputData.countHomeSmall} onChange={(v) => updateInput('countHomeSmall', v)} />
                                <PackageInput label="Home Advan" price="418.919" value={inputData.countHomeAdvan} onChange={(v) => updateInput('countHomeAdvan', v)} />
                            </div>
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-right font-medium">
                                * Mengisi ini akan menimpa field "Gaji" di atas (20% x Total)
                            </div>
                        </details>
                        
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-1">Incentive PSB</label>
                            <div className="col-span-2 grid grid-cols-[80px_1fr] gap-2">
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={inputData.psbCount || 0}
                                        onChange={(e) => updateInput('psbCount', Math.round(Number(e.target.value)))}
                                        className="w-full p-2 border rounded text-center font-medium text-blue-600 dark:text-blue-400 text-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0"
                                        step="1"
                                    />
                                    <span className="absolute right-1 top-2 text-gray-400 text-[10px]">pcs</span>
                                </div>
                                <InputCurrency value={inputData.incentivePsb || 0} onChange={(v) => updateInput('incentivePsb', v)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-start">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-1 pt-2">Incentive Instalasi</label>
                            <div className="col-span-2 space-y-2">
                                {/* 5.000 Rate */}
                                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={inputData.installationCount5k || 0}
                                            onChange={(e) => updateInput('installationCount5k', Math.round(Number(e.target.value)))}
                                            className="w-full p-2 border rounded text-center font-medium text-blue-600 dark:text-blue-400 text-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholder="0"
                                            step="1"
                                        />
                                        <span className="absolute right-1 top-2 text-gray-400 text-[10px]">x5k</span>
                                    </div>
                                    <div className="text-sm text-gray-500 italic">
                                        @ Rp 5.000
                                    </div>
                                </div>

                                {/* 10.000 Rate */}
                                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={inputData.installationCount10k || 0}
                                            onChange={(e) => updateInput('installationCount10k', Math.round(Number(e.target.value)))}
                                            className="w-full p-2 border rounded text-center font-medium text-blue-600 dark:text-blue-400 text-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholder="0"
                                            step="1"
                                        />
                                        <span className="absolute right-1 top-2 text-gray-400 text-[10px]">x10k</span>
                                    </div>
                                    <div className="text-sm text-gray-500 italic">
                                        @ Rp 10.000
                                    </div>
                                </div>
                                
                                <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                                     <InputCurrency value={inputData.incentiveInstalasi || 0} onChange={(v) => updateInput('incentiveInstalasi', v)} />
                                </div>
                            </div>
                        </div>

                        <InputItem label="Incentive Tagihan" value={inputData.incentiveTagihan || 0} onChange={(v) => updateInput('incentiveTagihan', v)} />
                        
                        {/* UMT Section with Days Input */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-1">UMT</label>
                            <div className="col-span-2 grid grid-cols-[80px_1fr] gap-2">
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={inputData.presentDays || 0}
                                        onChange={(e) => updateInput('presentDays', Math.round(Number(e.target.value)))}
                                        className="w-full p-2 border rounded text-center font-medium text-blue-600 dark:text-blue-400 text-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0"
                                        step="1"
                                    />
                                    <span className="absolute right-1 top-2 text-gray-400 text-[10px]">hari</span>
                                </div>
                                <InputCurrency value={inputData.umtAmount || 0} onChange={(v) => updateInput('umtAmount', v)} />
                            </div>
                        </div>

                        <InputItem label="Tunjangan Jabatan" value={inputData.positionAllowance} onChange={(v) => updateInput('positionAllowance', v)} />
                        <InputItem label="Overtime + Hari Libur" value={inputData.overtimeAmount} onChange={(v) => updateInput('overtimeAmount', v)} />
                        <InputItem label="Tunjangan Kesehatan" value={inputData.healthAllowance || 0} onChange={(v) => updateInput('healthAllowance', v)} />
                        <InputItem label="BPJS Ketenagakerjaan" value={inputData.bpjsAllowance} onChange={(v) => updateInput('bpjsAllowance', v)} />
                        <InputItem label="Transport" value={inputData.transportAmount} onChange={(v) => updateInput('transportAmount', v)} />
                        <InputItem label="Kedisiplinan" value={inputData.disciplineBonus} onChange={(v) => updateInput('disciplineBonus', v)} />

                      </>
                  ) : (
                      <>
                        <InputItem label="Kehadiran Absensi" value={inputData.baseSalary} onChange={(v) => updateInput('baseSalary', v)} />
                        <InputItem label="Transport" value={inputData.transportAmount} onChange={(v) => updateInput('transportAmount', v)} />
                        
                        {/* Overtime Block */}
                        <InputItem label="Overtime + Hari Libur" value={inputData.overtimeAmount} onChange={(v) => updateInput('overtimeAmount', v)} />
                        
                        <InputItem label="Kinerja" value={inputData.performanceBonus} onChange={(v) => updateInput('performanceBonus', v)} />
                        <InputItem label="Kedisiplinan" value={inputData.disciplineBonus} onChange={(v) => updateInput('disciplineBonus', v)} />
                        <InputItem label="Uang Makan" value={inputData.mealAllowance} onChange={(v) => updateInput('mealAllowance', v)} />
                        <InputItem label="Tunjangan Jabatan" value={inputData.positionAllowance} onChange={(v) => updateInput('positionAllowance', v)} />
                        <InputItem label="BPJS Ketenagakerjaan" value={inputData.bpjsAllowance} onChange={(v) => updateInput('bpjsAllowance', v)} />
                      </>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-black text-lg text-black dark:text-zinc-100">
                    <span>TOTAL</span>
                    <span className="text-green-700 dark:text-green-400">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inputData.totalIncome)}
                    </span>
                  </div>
                </div>

                {/* Potongan */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Potongan</h4>
                  
                  <InputItem label="Arisan" value={inputData.arisanDeduction} onChange={(v) => updateInput('arisanDeduction', v)} />
                  <InputItem label="Potongan JHT" value={inputData.jhtDeduction} onChange={(v) => updateInput('jhtDeduction', v)} />
                  <InputItem label="BON (Pinjaman)" value={inputData.loanDeduction} onChange={(v) => updateInput('loanDeduction', v)} />
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-black text-lg text-red-700 dark:text-red-400">
                    <span>TOTAL POTONGAN</span>
                    <span>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inputData.totalDeduction)}
                    </span>
                  </div>

                   <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center font-black text-xl text-black dark:text-zinc-100">
                    <span>TOTAL DITERIMA</span>
                    <span className="text-blue-800 dark:text-blue-400">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inputData.netSalary)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg flex justify-end gap-3">
                <button 
                  onClick={() => setShowInputModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded font-medium"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveSlip}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 font-bold flex items-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Menyimpan...' : 'Simpan & Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:bg-white print:p-0 print:static backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:overflow-visible border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 print:hidden sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h3 className="font-bold text-gray-800 dark:text-zinc-100">Preview Slip Gaji</h3>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => {
                        window.print()
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                   >
                     <Printer size={14} /> Print
                   </button>
                   <button 
                    onClick={() => setShowPreview(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>
              </div>
              <div className="p-8 bg-gray-50 dark:bg-black/50 print:bg-white print:p-0 min-h-[500px] flex justify-center">
                <div className="bg-white shadow-lg w-full max-w-2xl print:shadow-none print:w-full">
                    <SalarySlip 
                            data={selectedSlip} 
                            employeeName={selectedSlip.employee.name} 
                            role={selectedSlip.employee.role}
                            department={selectedSlip.employee.department}
                            month={selectedSlip.month}
                            year={selectedSlip.year}
                        />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
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

function InputItem({ label, value, onChange, readOnly = false }: { label: string, value: number, onChange: (val: number) => void, readOnly?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-center">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-1">{label}</label>
      <div className="col-span-2">
        <InputCurrency value={value} onChange={onChange} />
      </div>
    </div>
  )
}

function PackageInput({ label, price, value, onChange }: { label: string, price: string, value?: number, onChange: (val: number) => void }) {
    return (
        <div className="flex flex-col">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-gray-400 dark:text-gray-500">@{price}</span>
            </div>
            <div className="relative">
                 <input 
                    type="number" 
                    value={value || 0}
                    onChange={(e) => onChange(Math.round(Number(e.target.value)))}
                    className="w-full p-2 border rounded text-center font-medium text-gray-800 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0"
                    step="1"
                />
            </div>
        </div>
    )
}

function InputCurrency({ value, onChange }: { value: number, onChange: (val: number) => void }) {
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
        // Format with dots: 1000000 -> 1.000.000
        const formatted = (value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        setDisplayValue(formatted)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove dots and non-digits to get raw number
        const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
        const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10)
        
        onChange(numValue)
    }

    return (
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-700 dark:text-gray-400 font-medium text-sm">Rp</span>
            <input 
                type="text" 
                value={displayValue}
                onChange={handleChange}
                className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-right font-mono font-medium text-black dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-lg"
                placeholder="0"
            />
        </div>
    )
}
