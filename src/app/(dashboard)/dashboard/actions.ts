'use server'

import prisma from '@/lib/prisma'
import { unstable_noStore } from 'next/cache'

type NamedValue = { name: string; value: number }

const EMPTY_STATS = {
  employees: {
    total: 0,
    newCount: 0,
    byStatus: [] as NamedValue[],
    byDept: [] as NamedValue[]
  },
  attendance: {
    present: 0,
    late: 0,
    sick: 0,
    permit: 0,
    alpha: 0,
    total: 0,
    notPresent: 0
  },
  loans: {
    activeCount: 0,
    totalOutstanding: 0
  },
  permissions: {
    pendingCount: 0
  },
  salary: {
    totalMonth: 0
  }
}

export async function getDashboardStats() {
  unstable_noStore()
  const now = new Date()
  const WIB_OFFSET_HOURS = 7
  const nowWIB = new Date(now.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000)
  const wibYear = nowWIB.getUTCFullYear()
  const wibMonth = nowWIB.getUTCMonth()
  const wibDate = nowWIB.getUTCDate()
  const startOfToday = new Date(Date.UTC(wibYear, wibMonth, wibDate, -WIB_OFFSET_HOURS))
  const endOfToday = new Date(Date.UTC(wibYear, wibMonth, wibDate + 1, -WIB_OFFSET_HOURS))
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const result = JSON.parse(JSON.stringify(EMPTY_STATS)) as typeof EMPTY_STATS

  // 1. Employee Stats
  try {
    const [totalEmployees, newEmployeesCount, employeeByStatus, employeeByDept] = await Promise.all([
      prisma.employee.count({ where: { status: { not: 'RESIGNED' } } }),
      prisma.employee.count({ where: { joinDate: { gte: twoMonthsAgo } } }),
      prisma.employee.groupBy({ by: ['status'], _count: true }),
      prisma.employee.groupBy({ by: ['department'], _count: true })
    ])

    result.employees = {
      total: totalEmployees,
      newCount: newEmployeesCount,
      byStatus: employeeByStatus.map(e => ({ name: e.status, value: e._count })),
      byDept: employeeByDept.map(e => ({ name: e.department, value: e._count }))
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching employee stats:', error)
    }
  }

  // 2. Attendance Stats (Today)
  try {
    const attendanceToday = await prisma.attendance.findMany({
      where: { date: { gte: startOfToday, lt: endOfToday } },
      select: { status: true, checkIn: true }
    })

    const classify = (record: { status: string; checkIn: Date | null }) => {
      const rawStatus = (record.status || '').toUpperCase()

      if (['SICK', 'SAKIT'].includes(rawStatus)) return 'SICK'
      if (['PERMIT', 'IZIN'].includes(rawStatus)) return 'PERMIT'
      if (rawStatus === 'ALPHA') return 'ALPHA'

      const checkIn = record.checkIn
      if (checkIn) {
        const WIB_OFFSET = 7 * 60 * 60 * 1000
        const wib = new Date(checkIn.getTime() + WIB_OFFSET)
        const hour = wib.getUTCHours()
        const minute = wib.getUTCMinutes()

        const isShift2 = hour > 17 || (hour === 17 && minute >= 0)
        const isLateMorning = !isShift2 && (hour > 8 || (hour === 8 && minute > 0))

        if (isLateMorning) return 'LATE'
      }

      return 'PRESENT'
    }

    let presentCount = 0
    let lateCount = 0
    let sickCount = 0
    let permitCount = 0
    let alphaCount = 0

    for (const rec of attendanceToday) {
      const c = classify(rec as any)
      if (c === 'LATE') lateCount++
      else if (c === 'SICK') sickCount++
      else if (c === 'PERMIT') permitCount++
      else if (c === 'ALPHA') alphaCount++
      else presentCount++
    }

    const attendanceStats = {
      present: presentCount,
      late: lateCount,
      sick: sickCount,
      permit: permitCount,
      alpha: alphaCount,
      total: attendanceToday.length
    }

    const notPresent = Math.max(0, result.employees.total - attendanceStats.total)

    result.attendance = {
      ...attendanceStats,
      notPresent
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching attendance stats:', error)
    }
  }

  // 3. Loans Stats
  try {
    const activeLoans = await prisma.loan.findMany({
      where: { status: 'ACTIVE' },
      include: { payments: true }
    })

    let totalLoanOutstanding = 0
    activeLoans.forEach(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
      totalLoanOutstanding += loan.amount - totalPaid
    })

    result.loans = {
      activeCount: activeLoans.length,
      totalOutstanding: totalLoanOutstanding
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching loan stats:', error)
    }
  }

  // 4. Permissions (Pending)
  try {
    const pendingPermissions = await prisma.leaveRequest.count({
      where: { status: 'PENDING' }
    })

    result.permissions = {
      pendingCount: pendingPermissions
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching permission stats:', error)
    }
  }

  // 5. Salary Estimation (Current Month)
  try {
    const salarySlips = await prisma.salarySlip.aggregate({
      _sum: { netSalary: true },
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    })

    result.salary = {
      totalMonth: salarySlips._sum.netSalary || 0
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching salary stats:', error)
    }
  }

  return result
}
