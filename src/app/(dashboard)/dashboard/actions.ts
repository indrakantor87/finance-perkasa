'use server'

import prisma from '@/lib/prisma'

const EMPTY_STATS = {
  employees: {
    total: 0,
    newCount: 0,
    byStatus: [],
    byDept: []
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
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  try {
    // Parallelize all independent queries
    const [
      totalEmployees,
      newEmployeesCount,
      employeeByStatus,
      employeeByDept,
      attendanceToday,
      activeLoans,
      pendingPermissions,
      salarySlips
    ] = await Promise.all([
      // 1. Employee Stats
      prisma.employee.count({ where: { status: { not: 'RESIGNED' } } }),
      prisma.employee.count({ where: { joinDate: { gte: twoMonthsAgo } } }),
      prisma.employee.groupBy({ by: ['status'], _count: true }),
      prisma.employee.groupBy({ by: ['department'], _count: true }),

      // 2. Attendance Stats (Today)
      prisma.attendance.findMany({
        where: { date: { gte: startOfToday, lt: endOfToday } },
        select: { status: true }
      }),

      // 3. Loans Stats
      prisma.loan.findMany({
        where: { status: 'ACTIVE' },
        include: { payments: true }
      }),

      // 4. Permissions (Pending)
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),

      // 5. Salary Estimation (Current Month)
      prisma.salarySlip.aggregate({
        _sum: { netSalary: true },
        where: {
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      })
    ])

    // Process Attendance
    const attendanceStats = {
      present: attendanceToday.filter(a => ['PRESENT', 'HADIR'].includes(a.status)).length,
      late: attendanceToday.filter(a => ['LATE', 'TERLAMBAT'].includes(a.status)).length,
      sick: attendanceToday.filter(a => ['SICK', 'SAKIT'].includes(a.status)).length,
      permit: attendanceToday.filter(a => ['PERMIT', 'IZIN'].includes(a.status)).length,
      alpha: attendanceToday.filter(a => a.status === 'ALPHA').length,
      total: attendanceToday.length
    }
    
    // Calculate Not Present
    const notPresent = Math.max(0, totalEmployees - attendanceStats.total)

    // Process Loans
    let totalLoanOutstanding = 0
    activeLoans.forEach(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
      totalLoanOutstanding += (loan.amount - totalPaid)
    })

    return {
      employees: {
        total: totalEmployees,
        newCount: newEmployeesCount,
        byStatus: employeeByStatus.map(e => ({ name: e.status, value: e._count })),
        byDept: employeeByDept.map(e => ({ name: e.department, value: e._count }))
      },
      attendance: {
        ...attendanceStats,
        notPresent
      },
      loans: {
        activeCount: activeLoans.length,
        totalOutstanding: totalLoanOutstanding
      },
      permissions: {
        pendingCount: pendingPermissions
      },
      salary: {
        totalMonth: salarySlips._sum.netSalary || 0
      }
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching dashboard stats:', error)
    }
    return EMPTY_STATS
  }
}
