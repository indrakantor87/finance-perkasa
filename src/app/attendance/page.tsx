'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import UserMenu from '@/components/UserMenu'
import { 
  Users, Calendar, Clock, FileText, Settings, LogOut, 
  LayoutDashboard, Database, UserCheck, Banknote, 
  CreditCard, FileCheck, Bell, Upload, Search, Filter, CheckCircle, XCircle, AlertCircle, Download, Edit3, ChevronDown, Trash2, RefreshCw
} from 'lucide-react';

interface Attendance {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  overtimeHours: number
  employeeId: string
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

interface GroupedAttendance {
  employeeId: string
  employeeName: string
  employeeRole: string
  attendances: Attendance[]
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const getLocalISODate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [startDate, setStartDate] = useState(getLocalISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [endDate, setEndDate] = useState(getLocalISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)))
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const start = new Date(selectedYear, selectedMonth, 1)
    const end = new Date(selectedYear, selectedMonth + 1, 0)
    setStartDate(getLocalISODate(start))
    setEndDate(getLocalISODate(end))
  }, [selectedMonth, selectedYear])

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editCheckIn, setEditCheckIn] = useState<string>('') // HH:MM
  const [editCheckOut, setEditCheckOut] = useState<string>('') // HH:MM
  const [editExtra, setEditExtra] = useState<string>('') // hours (decimal)
  const [isEditing, setIsEditing] = useState(false)
  const [editingRow, setEditingRow] = useState<Attendance | null>(null)
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null)
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]) // Employee IDs

  const [editingGroup, setEditingGroup] = useState<GroupedAttendance | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

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
    // If specific employees are selected, export only their data. Otherwise, export filteredAttendances.
    const sourceData = selectedExportIds.length > 0
      ? filteredAttendances.filter(att => selectedExportIds.includes(att.employeeId))
      : filteredAttendances

    if (sourceData.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }

    const dataToExport = sourceData.map(att => ({
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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all currently visible groups
      const allIds = groupedAttendances.map(g => g.employeeId)
      setSelectedExportIds(allIds)
    } else {
      setSelectedExportIds([])
    }
  }

  const toggleSelectOne = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedExportIds(prev => [...prev, employeeId])
    } else {
      setSelectedExportIds(prev => prev.filter(id => id !== employeeId))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImportFile(file)
      parseFile(file)
    }
  }

  const parseFile = (file: File) => {
    const fileBaseName = (file.name || '').replace(/\.[^/.]+$/, '')
    const parseWorkbook = (workbook: XLSX.WorkBook) => {
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) return false
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
      if (!jsonData || jsonData.length < 2) return false
      const fileBase = (fileBaseName || '').trim()
      const normalize = (s: any) => s?.toString().toLowerCase().trim()
      const headers = (jsonData[0] as string[]).map(h => normalize(h))
      
      const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('user') || h.includes('pegawai'))
      const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date') || h.includes('tgl'))
      const inIdx = headers.findIndex(h => h.includes('masuk') || h.includes('in') || h.includes('check-in') || h.includes('jam masuk'))
      const outIdx = headers.findIndex(h => h.includes('pulang') || h.includes('out') || h.includes('keluar') || h.includes('check-out') || h.includes('jam pulang'))
      let timeIdx = headers.findIndex(h => h.includes('time') || h.includes('waktu') || h.includes('scan') || h.includes('clock') || h.includes('jam'))
      const stateIdx = headers.findIndex(h => h.includes('state') || h.includes('status') || h.includes('event'))
      
      if (nameIdx === -1 && !fileBase) {
        alert('Kolom "Nama" tidak ditemukan dan tidak bisa menebak dari nama file.')
        return false
      }

      // Helper to match employee
      const normName = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const matchEmployee = (raw: any) => {
        const n = normName(raw?.toString() || '')
        if (!n) return null
        
        // 1. Exact match
        const exact = employees.find(emp => normName(emp.name) === n)
        if (exact) return exact
        
        // 2. Contains match (Employee name contains File name OR File name contains Employee name)
        // Be careful with short names like "Adi" matching "Adi Susilo" and "Budi Adi"
        const candidates = employees.filter(emp => {
          const empN = normName(emp.name)
          return empN.includes(n) || n.includes(empN)
        })
        
        if (candidates.length === 1) return candidates[0]
        
        // 3. Fuzzy match (Token based)
        const nTokens = n.split(' ')
        const fuzzy = employees.find(emp => {
          const empTokens = normName(emp.name).split(' ')
          // If all tokens in file name appear in employee name
          return nTokens.every(t => empTokens.includes(t))
        })
        if (fuzzy) return fuzzy
        
        return null
      }

      const toDateString = (val: any, fallbackFromTime?: Date) => {
        if (!val && fallbackFromTime) return fallbackFromTime.toISOString().split('T')[0]
        if (val instanceof Date) return val.toISOString().split('T')[0]
        if (typeof val === 'number') {
          const d = new Date(Math.round((val - 25569) * 86400 * 1000))
          return d.toISOString().split('T')[0]
        }
        const s = val?.toString()?.trim() || ''
        const match = s.match(/(\d{4}-\d{2}-\d{2})/)
        if (match) return match[1]
        const dmMatch = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
        if (dmMatch) {
          let dd = dmMatch[1].padStart(2, '0')
          let mm = dmMatch[2].padStart(2, '0')
          let yyyy = dmMatch[3].length === 2 ? `20${dmMatch[3]}` : dmMatch[3]
          return `${yyyy}-${mm}-${dd}`
        }
        return s
      }

      const toTimeString = (val: any) => {
        if (!val) return null
        if (val instanceof Date) {
          const h = val.getHours().toString().padStart(2, '0')
          const m = val.getMinutes().toString().padStart(2, '0')
          return `${h}:${m}`
        }
        if (typeof val === 'number') {
          const totalSeconds = Math.round(val * 86400)
          const hours = Math.floor(totalSeconds / 3600)
          const minutes = Math.floor((totalSeconds % 3600) / 60)
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        }
        const s = val.toString().trim().replace('.', ':')
        const m = s.match(/(\d{1,2}):(\d{2})/)
        if (m) {
          const hh = m[1].padStart(2, '0')
          const mm = m[2].padStart(2, '0')
          return `${hh}:${mm}`
        }
        const m2 = s.match(/(\d{1,2})\.(\d{2})/)
        if (m2) {
          const hh = m2[1].padStart(2, '0')
          const mm = m2[2].padStart(2, '0')
          return `${hh}:${mm}`
        }
        return null
      }

      // Try to guess time column if not found
      if (timeIdx === -1 && inIdx === -1 && outIdx === -1) {
        const sampleRows = jsonData.slice(1, Math.min(jsonData.length, 21)) as any[]
        let bestIdx = -1
        let bestScore = 0
        const maxLen = Math.max(...sampleRows.map(r => Array.isArray(r) ? r.length : 0))
        for (let ci = 0; ci < maxLen; ci++) {
          if (ci === nameIdx || ci === dateIdx) continue
          let score = 0
          for (const row of sampleRows) {
            const val = row?.[ci]
            const t = toTimeString(val)
            if (t) score++
          }
          if (score > bestScore) {
            bestScore = score
            bestIdx = ci
          }
        }
        if (bestScore >= 3) timeIdx = bestIdx
      }

      let parsedData: any[] = []

      // Strategy 1: Explicit In/Out columns
      if (inIdx !== -1 || outIdx !== -1) {
        parsedData = jsonData.slice(1).map((row: any, index) => {
          const name = nameIdx !== -1 ? row[nameIdx] : fileBase
          if (!name) return null
          const emp = matchEmployee(name)
          
          let dateStr = ''
          if (dateIdx !== -1) dateStr = toDateString(row[dateIdx])
          
          // If no date column, maybe date is in filename? or implied?
          if (!dateStr) {
             // Try to find date in filename like "Absensi_2024-01-01.xlsx"
             const m = fileBaseName.match(/(\d{4}-\d{2}-\d{2})/)
             if (m) dateStr = m[1]
             else {
               // Last resort: if In/Out are Dates, use that
               if (row[inIdx] instanceof Date) dateStr = row[inIdx].toISOString().split('T')[0]
             }
          }

          const timeIn = toTimeString(row[inIdx])
          const timeOut = toTimeString(row[outIdx])
          
          if (!dateStr && !timeIn && !timeOut) return null

          return {
            id: index,
            employeeName: name,
            employeeId: emp?.id || null,
            date: dateStr,
            checkIn: (dateStr && timeIn) ? `${dateStr}T${timeIn}:00` : null,
            checkOut: (dateStr && timeOut) ? `${dateStr}T${timeOut}:00` : null,
            status: 'PRESENT',
            isValid: !!emp && !!dateStr
          }
        }).filter(Boolean)
      } 
      // Strategy 2: Single Time column (Vertical format)
      else if (timeIdx !== -1) {
        const groups: Record<string, { name: string, empId: string | null, date: string, times: string[], inTimes: string[], outTimes: string[], hasOT: boolean }> = {}
        jsonData.slice(1).forEach((row: any) => {
          const name = nameIdx !== -1 ? row[nameIdx] : fileBase
          if (!name) return
          const emp = matchEmployee(name)
          const timeRaw = row[timeIdx]
          let timeDate: Date | undefined
          if (typeof timeRaw === 'number') {
            const millis = Math.round((timeRaw - 25569) * 86400 * 1000)
            timeDate = new Date(millis)
          }
          const dateStr = toDateString(dateIdx !== -1 ? row[dateIdx] : (timeDate || timeRaw))
          const timeStr = toTimeString(timeDate || timeRaw)
          if (!dateStr) return
          
          const key = `${normName(name)}|${dateStr}`
          if (!groups[key]) {
            groups[key] = { name, empId: emp?.id || null, date: dateStr, times: [], inTimes: [], outTimes: [], hasOT: false }
          }
          const stateRaw = stateIdx !== -1 ? (row[stateIdx]?.toString()?.toLowerCase() || '') : ''
          const isIn = stateRaw.includes('c/in') || stateRaw.includes('check-in') || stateRaw.includes('in') || stateRaw.includes('overtime in')
          const isOut = stateRaw.includes('c/out') || stateRaw.includes('check-out') || stateRaw.includes('out') || stateRaw.includes('overtime out')
          const isOT = stateRaw.includes('overtime') || stateRaw.includes('lembur')
          if (timeStr) {
            if (isIn) groups[key].inTimes.push(timeStr)
            else if (isOut) groups[key].outTimes.push(timeStr)
            else groups[key].times.push(timeStr)
          }
          if (isOT) groups[key].hasOT = true
        })
        parsedData = Object.values(groups).map((g, idx) => {
          const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number)
            return h * 60 + m
          }
          const sorted = [...g.times].filter(Boolean).map(t => ({ t, s: toMinutes(t) })).sort((a, b) => a.s - b.s)
          const sortedIn = [...g.inTimes].filter(Boolean).map(t => ({ t, s: toMinutes(t) })).sort((a, b) => a.s - b.s)
          const sortedOut = [...g.outTimes].filter(Boolean).map(t => ({ t, s: toMinutes(t) })).sort((a, b) => a.s - b.s)
          const first = (sortedIn[0]?.t || sorted[0]?.t) || null
          const last = (sortedOut[sortedOut.length - 1]?.t || sorted[sorted.length - 1]?.t) || null
          return {
            id: idx,
            employeeName: g.name,
            employeeId: g.empId,
            date: g.date,
            checkIn: first ? `${g.date}T${first}:00` : null,
            checkOut: last && last !== first ? `${g.date}T${last}:00` : null,
            status: 'PRESENT',
            isValid: !!g.empId
          }
        })
      } else {
        alert('Kolom waktu (Jam Masuk/Pulang atau Time) tidak ditemukan. Gunakan template yang disediakan.')
        return false
      }
      setImportPreview(parsedData)
      return parsedData.length > 0
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: 'array' })
        const ok = parseWorkbook(workbook)
        if (!ok) {
          const reader2 = new FileReader()
          reader2.onload = (ev) => {
            try {
              const data2 = ev.target?.result as string
              const workbook2 = XLSX.read(data2, { type: 'binary' })
              const ok2 = parseWorkbook(workbook2)
              if (!ok2) {
                // Alert handled inside parseWorkbook or just generic
              }
            } catch (err2) {
              console.error('Error parsing file:', err2)
              alert('Gagal membaca file. Pastikan format Excel benar.')
            }
          }
          reader2.readAsBinaryString(file)
        }
      } catch (error) {
        console.error('Error parsing file:', error)
        alert('Gagal membaca file. Pastikan format Excel benar.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
        { 'Nama': 'Contoh Nama', 'Tanggal': '2024-01-01', 'Jam Masuk': '08:00', 'Jam Pulang': '17:00' },
        { 'Nama': 'Budi Santoso', 'Tanggal': '2024-01-01', 'Jam Masuk': '08:05', 'Jam Pulang': '17:10' }
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, "Template_Import_Absensi.xlsx")
  }

  const handleSyncMachine = async () => {
    if (!confirm('Apakah anda yakin ingin menyinkronkan data dari mesin finger? Proses ini mungkin memakan waktu.')) return

    setIsSyncing(true)
    try {
      const res = await fetch('/api/attendance/sync', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        let msg = `Sync Berhasil!\nProcessed: ${data.details?.processed || 0}\nCreated: ${data.details?.created || 0}\nUpdated: ${data.details?.updated || 0}`
        
        if (data.details?.unmappedCount > 0) {
           msg += `\n\nWARNING: ${data.details.unmappedCount} Users di mesin tidak ditemukan di database (Nama tidak cocok).\nContoh: ${data.details.unmappedNames}`
        }
        
        alert(msg)
        fetchAttendance()
      } else {
        console.error('Sync failed:', data)
        alert('Sync Gagal: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Sync error:', err)
      alert('Terjadi kesalahan saat sync.')
    } finally {
      setIsSyncing(false)
    }
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
  
  const toMinutes = (dotFormat: number) => {
    const h = Math.floor(dotFormat)
    const m = Math.round((dotFormat - h) * 100)
    return h * 60 + m
  }

  const toDotFormat = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return parseFloat(`${h}.${m.toString().padStart(2, '0')}`)
  }

  const calcOvertimeHours = (inISO: string | null, outISO: string | null) => {
    if (!inISO || !outISO) return 0
    const inDate = new Date(inISO)
    const outDate = new Date(outISO)
    
    // Check if check-in is after 17:00 (Local Time)
    const inHour = inDate.getHours()
    const inMinute = inDate.getMinutes()
    const isLateCheckIn = inHour > 17 || (inHour === 17 && inMinute > 0)

    if (isLateCheckIn) {
      // Condition 2: Check-in > 17:00. Calculate duration as overtime.
      const totalDuration = (outDate.getTime() - inDate.getTime()) / 60000
      if (totalDuration <= 0) return 0
      return toDotFormat(totalDuration)
    }

    // Condition 1: Normal check-in (<= 17:00). Overtime is ignored.
    return 0
  }

  const calcExtra = (att: Attendance) => {
    const computedDot = calcOvertimeHours(att.checkIn, att.checkOut)
    const computedMin = toMinutes(computedDot)
    const totalMin = toMinutes(att.overtimeHours)
    
    if (computedMin > 0) {
      const extraMin = Math.max(0, totalMin - computedMin)
      return toDotFormat(extraMin)
    }
    return att.overtimeHours
  }
  const hoursToHHMM = (h: number) => {
    const totalMin = Math.round(h * 60)
    const hh = Math.floor(totalMin / 60).toString().padStart(2, '0')
    const mm = (totalMin % 60).toString().padStart(2, '0')
    return `${hh}:${mm}`
  }
  const hoursToHHMMDot = (h: number) => {
    const totalMin = Math.round(h * 60)
    const hh = Math.floor(totalMin / 60).toString().padStart(2, '0')
    const mm = (totalMin % 60).toString().padStart(2, '0')
    return `${hh}.${mm}`
  }
  const hhmmToHours = (s: string) => {
    const t = s.trim()
    if (!t) return undefined
    if (t === '0' || t === '00' || t === '00:00' || t === '00.00') return 0
    // Accept HH:MM
    const m = t.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const hh = parseInt(m[1], 10)
      const mm = parseInt(m[2], 10)
      if (isNaN(hh) || isNaN(mm)) return undefined
      return parseFloat(((hh * 60 + mm) / 60).toFixed(2))
    }
    // Accept HH.MM or H.MM (dot)
    const mdot = t.match(/^(\d{1,2})\.(\d{2})$/)
    if (mdot) {
      const hh = parseInt(mdot[1], 10)
      const mm = parseInt(mdot[2], 10)
      if (isNaN(hh) || isNaN(mm)) return undefined
      return parseFloat(((hh * 60 + mm) / 60).toFixed(2))
    }
    // Accept HH,MM (comma)
    const mcomma = t.match(/^(\d{1,2}),(\d{2})$/)
    if (mcomma) {
      const hh = parseInt(mcomma[1], 10)
      const mm = parseInt(mcomma[2], 10)
      if (isNaN(hh) || isNaN(mm)) return undefined
      return parseFloat(((hh * 60 + mm) / 60).toFixed(2))
    }
    // Accept decimal hours like "1" or "1.5"
    const dec = parseFloat(t.replace(',', '.'))
    if (!isNaN(dec) && dec >= 0) return parseFloat(dec.toFixed(2))
    return undefined
  }

  const formatTimeForInput = (isoString: string | null) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const openEditModalForRow = (att: Attendance) => {
    setEditingRow(att)
    setEditCheckIn(formatTimeForInput(att.checkIn))
    setEditCheckOut(formatTimeForInput(att.checkOut))
    const extra = calcExtra(att)
    setEditExtra(extra > 0 ? hoursToHHMM(extra) : '')
    setShowEditModal(true)
    setOpenMenuRowId(null)
  }

  const openEditModalForGroup = (group: GroupedAttendance) => {
    setEditingGroup(group)
    // Default to today if exists, else first record
    const todayStr = getLocalISODate(new Date())
    const todayAtt = group.attendances.find((a) => a.date === todayStr)
    const att = todayAtt || group.attendances[0]
    
    if (att) {
      setEditingRow(att)
      setEditCheckIn(formatTimeForInput(att.checkIn))
      setEditCheckOut(formatTimeForInput(att.checkOut))
      // Use overtimeHours directly for modal input (decimal)
      const extra = att.overtimeHours
      // If extra is > 0, calculate manual extra part if needed? 
      // Simplified: just show overtimeHours. 
      // Note: previous code used calcExtra which might separate auto-calculated from manual.
      // But for simplicity in modal, let's just use what's stored or 0.
      setEditExtra(extra > 0 ? extra.toString() : '') 
      setShowEditModal(true)
      setOpenMenuRowId(null)
    }
  }

  const handleGroupDateChange = (date: string) => {
    if (!editingGroup) return
    const att = editingGroup.attendances.find((a) => a.date === date)
    if (att) {
      setEditingRow(att)
      setEditCheckIn(formatTimeForInput(att.checkIn))
      setEditCheckOut(formatTimeForInput(att.checkOut))
      const extra = att.overtimeHours
      setEditExtra(extra > 0 ? extra.toString() : '')
    }
  }

  const openInlineEditForRow = (att: Attendance) => {
    setEditingRow(att)
    setEditCheckIn(formatTimeForInput(att.checkIn))
    setEditCheckOut(formatTimeForInput(att.checkOut))
    const extra = calcExtra(att)
    setEditExtra(extra > 0 ? hoursToHHMM(extra) : '')
    // Don't change openMenuRowId, keep the group expanded
  }

  const toISOWithDate = (dateStr: string, timeHHMM: string | undefined) => {
    if (!timeHHMM) return null
    const t = timeHHMM.trim()
    if (!t) return null
    let dateOnly = dateStr
    if (dateOnly.includes('T')) {
      const d = new Date(dateOnly)
      if (!isNaN(d.getTime())) {
        dateOnly = d.toISOString().split('T')[0]
      } else {
        // fallback: try splitting manually
        dateOnly = dateOnly.split('T')[0]
      }
    }
    return `${dateOnly}T${t.padStart(5, '0')}:00`
  }

  const handleEditSubmit = async () => {
    if (!editingRow) return
    setIsEditing(true)
    try {
      const att = editingRow
      const dateOnly = (() => {
        let s = att.date
        if (s.includes('T')) {
          const d = new Date(s)
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
          return s.split('T')[0]
        }
        return s
      })()
      const payloadItem: any = {
        id: att.id,
        employeeId: att.employeeId
      }
      
      const initialIn = formatTimeForInput(att.checkIn)
      const initialOut = formatTimeForInput(att.checkOut)
      const initialExtra = calcExtra(att) > 0 ? hoursToHHMM(calcExtra(att)) : ''
      
      const checkInISO = toISOWithDate(dateOnly, editCheckIn || undefined)
      const checkOutISO = toISOWithDate(dateOnly, editCheckOut || undefined)
      const extra = hhmmToHours(editExtra)
      
      // Only include fields that have changed
      if (editCheckIn !== initialIn) {
         payloadItem.date = dateOnly // date is required when updating checkIn
         payloadItem.checkIn = editCheckIn.trim() ? checkInISO : null
      }
      
      if (editCheckOut !== initialOut) {
         payloadItem.date = dateOnly // date is required when updating checkOut
         payloadItem.checkOut = editCheckOut.trim() ? checkOutISO : null
      }
      
      // Compare extra (handle empty string vs 0 difference)
      const currentExtraVal = typeof extra === 'number' ? extra : 0
      const initialExtraVal = calcExtra(att)
      // If editExtra is empty string and initial was 0, no change.
      // If editExtra is '0' and initial was 0, no change.
      // But we use string comparison for simplicity if format is consistent, 
      // OR value comparison.
      // Since editExtra can be '01.00' and initial '01:00', better compare values.
      const isExtraChanged = Math.abs(currentExtraVal - initialExtraVal) > 0.001
      
      // Special case: if user clears the input (editExtra is empty string) and initial was > 0
      const isExtraCleared = editExtra.trim() === '' && initialExtraVal > 0
      
      if (isExtraChanged || isExtraCleared) {
        // We need to send TOTAL overtime hours to the server (Computed + Extra)
        // But the server logic will try to recalculate "extra" if we just send overtimeHours?
        // Wait, the API logic says:
        // if hasExtra (overtimeHours is present in body), use it as finalExtra.
        // No.
        // API logic: 
        // if (hasExtra) { finalExtra = parseExtra(item.overtimeHours) }
        // ...
        // const newOT = toDotFormat(computedOTMin + finalExtraMin)
        
        // So here we should send the EXTRA amount as 'overtimeHours' in the payload?
        // Re-reading API:
        // if (hasExtra) finalExtra = parseExtra(item.overtimeHours)
        // const newOT = computedOT + finalExtra
        
        // So YES, we send the EXTRA amount.
        payloadItem.overtimeHours = currentExtraVal
      }

      // If no changes, return early
      if (!payloadItem.hasOwnProperty('checkIn') && !payloadItem.hasOwnProperty('checkOut') && !payloadItem.hasOwnProperty('overtimeHours')) {
        setIsEditing(false)
        // setOpenMenuRowId(null) // Don't close the group
        setEditingRow(null)
        setShowEditModal(false)
        return
      }

      const payload = [payloadItem]

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Berhasil mengedit data absensi`)
        setShowEditModal(false)
        setEditCheckIn('')
        setEditCheckOut('')
        setEditExtra('')
        setEditingRow(null)
        // setOpenMenuRowId(null) // Don't close the group
        fetchAttendance()
      } else {
        try {
          const err = await res.json()
          alert(err?.error || 'Gagal mengedit data absensi')
        } catch {
          alert('Gagal mengedit data absensi')
        }
      }
    } catch (err) {
      console.error('Edit error', err)
      alert('Terjadi kesalahan saat edit')
    } finally {
      setIsEditing(false)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSubmit()
    }
  }

  const handleDeleteGroup = async (group: GroupedAttendance) => {
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('id-ID', { month: 'long' });
    if (!confirm(`Apakah Anda yakin ingin menghapus SEMUA data absensi untuk ${group.employeeName} di bulan ${monthName} ${selectedYear}?`)) return

    try {
      const res = await fetch(`/api/attendance?employeeId=${group.employeeId}&month=${selectedMonth + 1}&year=${selectedYear}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Data berhasil dihapus')
        fetchAttendance()
      } else {
        const err = await res.json()
        alert(err.error || 'Gagal menghapus data')
      }
    } catch (err) {
      console.error('Delete error', err)
      alert('Terjadi kesalahan')
    }
  }

  // Group filtered attendances by employee
  const groupedAttendances = filteredAttendances.reduce((acc, curr) => {
    const existing = acc.find(g => g.employeeId === curr.employeeId)
    if (existing) {
      existing.attendances.push(curr)
    } else {
      acc.push({
        employeeId: curr.employeeId,
        employeeName: curr.employee.name,
        employeeRole: curr.employee.role,
        attendances: [curr]
      })
    }
    return acc
  }, [] as GroupedAttendance[])

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
       {/* Header */}
       <header className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-full">
            <img src="/uploads/logo-perkasa.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">FINANCE PERKASA</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative block">
            <Bell className="w-5 h-5 cursor-pointer hover:text-gray-200" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] w-4 h-4 flex items-center justify-center rounded-full">3</span>
          </Link>
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
          <div className="flex gap-2">
            <button 
              onClick={handleSyncMachine}
              disabled={isSyncing}
              className={`bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> 
              {isSyncing ? 'Syncing...' : 'Sync Mesin'}
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Upload size={18} /> Import Data Fingerprint
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex flex-1 gap-4 items-center flex-wrap">
                {/* Date Range Filter */}
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium bg-white"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Export Excel
                </button>

                {/* Category Tabs inside Filter */}
                <div className="flex bg-white rounded-lg border p-1 overflow-x-auto">
                  {['Semua', 'Pemasaran dan Pelayanan', 'Operasional', 'General Affair', 'Keuangan dan HR', 'Teknis dan Expan'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
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
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 font-medium placeholder:text-gray-600"
                />
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      checked={groupedAttendances.length > 0 && selectedExportIds.length === groupedAttendances.length}
                    />
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Karyawan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Absensi</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Memuat data...</td></tr>
                ) : groupedAttendances.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Tidak ada data absensi</td></tr>
                ) : (
                  groupedAttendances.map((group, index) => (
                    <React.Fragment key={group.employeeId}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedExportIds.includes(group.employeeId)}
                            onChange={(e) => toggleSelectOne(group.employeeId, e.target.checked)}
                          />
                        </td>
                        <td className="px-6 py-3 relative">
                          <button
                            onClick={() => openMenuRowId === group.employeeId ? setOpenMenuRowId(null) : setOpenMenuRowId(group.employeeId)}
                            className="p-1 rounded hover:bg-gray-100 transition-transform"
                            aria-label="Menu"
                          >
                            <ChevronDown size={16} className={`text-gray-600 transition-transform duration-200 ${openMenuRowId === group.employeeId ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-gray-900 font-medium">{index + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{group.employeeName}</td>
                        <td className="px-6 py-3 text-gray-500">{group.employeeRole}</td>
                        <td className="px-6 py-3">
                          {(() => {
                            const totalDays = group.attendances.length
                            const rajinCount = group.attendances.filter(a => a.checkIn && a.checkOut).length
                            const percentage = totalDays > 0 ? (rajinCount / totalDays) * 100 : 0
                            
                            let status = 'Buruk'
                            let colorClass = 'bg-red-100 text-red-700'
                            
                            if (percentage >= 80) {
                              status = 'Baik'
                              colorClass = 'bg-green-100 text-green-700'
                            } else if (percentage >= 50) {
                              status = 'Kurang'
                              colorClass = 'bg-yellow-100 text-yellow-700'
                            }
                            
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                {status}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                            title="Hapus Semua Absensi Bulan Ini"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {openMenuRowId === group.employeeId && (
                        <tr>
                          <td colSpan={7} className="px-6 pb-4 pt-2 bg-gray-50/50">
                            <div className="rounded-lg border shadow-sm bg-white overflow-hidden animate-in slide-in-from-top-2 duration-200">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Karyawan</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Masuk</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Pulang</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ekstra (Jam)</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lembur (Jam)</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.attendances.map((att) => (
                                    <tr key={att.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {new Date(att.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{att.employee.name}</td>
                                      <td className="px-4 py-2">
                                        {editingRow?.id === att.id ? (
                                          <input
                                            type="time"
                                            value={editCheckIn}
                                            onChange={(e) => setEditCheckIn(e.target.value)}
                                            onKeyDown={handleEditKeyDown}
                                            className="w-full p-1.5 border border-gray-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-green-600 font-medium">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {editingRow?.id === att.id ? (
                                          <input
                                            type="time"
                                            value={editCheckOut}
                                            onChange={(e) => setEditCheckOut(e.target.value)}
                                            onKeyDown={handleEditKeyDown}
                                            className="w-full p-1.5 border border-gray-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-green-600 font-medium">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {editingRow?.id === att.id ? (
                                          <input
                                            type="number"
                                            step="0.25"
                                            min="0"
                                            value={editExtra}
                                            onChange={(e) => setEditExtra(e.target.value)}
                                            onKeyDown={handleEditKeyDown}
                                            className="w-24 p-1.5 border border-gray-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-gray-900">{att.overtimeHours > calcOvertimeHours(att.checkIn, att.checkOut) ? (att.overtimeHours - calcOvertimeHours(att.checkIn, att.checkOut)).toFixed(2) : '-'}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          (!att.checkIn && !att.checkOut) ? 'bg-red-100 text-red-700' :
                                          (att.checkIn && att.checkOut) ? 'bg-green-100 text-green-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {(!att.checkIn && !att.checkOut) ? 'Alfa' : (att.checkIn && att.checkOut) ? 'Valid' : 'Invalid'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-red-600 font-bold">
                                        {(() => {
                                          const calculated = calcOvertimeHours(att.checkIn, att.checkOut)
                                          const stored = att.overtimeHours || 0
                                          const displayValue = Math.max(stored, calculated)
                                          return displayValue > 0 ? `${displayValue} Jam` : '-'
                                        })()}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-2">
                                          {editingRow?.id === att.id ? (
                                            <>
                                              <button
                                                onClick={handleEditSubmit}
                                                disabled={isEditing}
                                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                title="Simpan"
                                              >
                                                <CheckCircle size={16} />
                                              </button>
                                              <button
                                                onClick={() => { setEditingRow(null); }}
                                                className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                                title="Batal"
                                              >
                                                <XCircle size={16} />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => openInlineEditForRow(att)}
                                              className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                              title="Edit"
                                            >
                                              <Edit3 size={16} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-100">
                                  <tr>
                                    <td colSpan={6} className="px-4 py-2 text-sm font-bold text-gray-700 text-right">Total Lembur:</td>
                                    <td className="px-4 py-2 text-sm font-bold text-red-600">
            {(() => {
              const totalMin = group.attendances.reduce((acc, curr) => {
                const calculated = calcOvertimeHours(curr.checkIn, curr.checkOut)
                const stored = curr.overtimeHours || 0
                const actual = Math.max(stored, calculated)
                return acc + toMinutes(actual)
              }, 0)
              const h = Math.floor(totalMin / 60)
              const m = Math.round(totalMin % 60)
              return `${h}.${m.toString().padStart(2, '0')}`
            })()} Jam
          </td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls"
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
                    onClick={(e) => { e.preventDefault(); downloadTemplate(); }}
                    className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Download Template
                  </a>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Format Excel/CSV: Nama, Tanggal (YYYY-MM-DD), Jam Masuk (HH:MM), Jam Pulang (HH:MM)
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
                              <span className={item.isValid ? 'text-gray-900 font-medium' : 'text-red-600 font-medium'}>{item.employeeName}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-900 font-medium">{item.date}</td>
                            <td className="px-4 py-2 text-gray-900 font-medium">{item.checkIn ? item.checkIn.split('T')[1].substring(0, 5) : '-'}</td>
                            <td className="px-4 py-2 text-gray-900 font-medium">{item.checkOut ? item.checkOut.split('T')[1].substring(0, 5) : '-'}</td>
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
                disabled={isImporting || importPreview.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? 'Mengimport...' : 'Proses Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Edit3 className="text-blue-600" /> Edit Jam Absensi
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Absensi</label>
                  <select
                    value={editingRow?.date || ''}
                    onChange={(e) => handleGroupDateChange(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium bg-white"
                  >
                    {editingGroup.attendances.map((att) => (
                      <option key={att.id} value={att.date}>
                        {new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
                <input
                  type="time"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Pulang</label>
                <input
                  type="time"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ekstra Lembur (Jam)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={editExtra}
                  onChange={(e) => setEditExtra(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-700"
                />
                <p className="mt-1 text-xs text-gray-500">Ditambahkan di atas lembur hasil hitung jam masuk/pulang</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Batal
              </button>
              <button 
                onClick={handleEditSubmit}
                disabled={isEditing || !editingRow}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
