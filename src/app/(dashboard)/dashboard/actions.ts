'use server'

import prisma from '@/lib/prisma'

export async function getDashboardStats() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  try {
    // 1. Employee Stats
    const totalEmployees = await prisma.employee.count({
      where: { status: { not: 'RESIGNED' } } // Asumsi ada status resign, atau ambil semua
    })

    const newEmployeesCount = await prisma.employee.count({
      where: { 
        joinDate: { gte: twoMonthsAgo }
      }
    })

    const employeeByStatus = await prisma.employee.groupBy({
      by: ['status'],
      _count: true,
    })

    const employeeByDept = await prisma.employee.groupBy({
      by: ['department'],
      _count: true,
    })

    // 2. Attendance Stats (Today)
    const attendanceToday = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfToday,
          lt: endOfToday
        }
      },
      select: {
        status: true
      }
    })

    const attendanceStats = {
      present: attendanceToday.filter(a => a.status === 'PRESENT' || a.status === 'HADIR').length,
      late: attendanceToday.filter(a => a.status === 'LATE' || a.status === 'TERLAMBAT').length, // Sesuaikan enum
      sick: attendanceToday.filter(a => a.status === 'SICK' || a.status === 'SAKIT').length,
      permit: attendanceToday.filter(a => a.status === 'PERMIT' || a.status === 'IZIN').length,
      alpha: attendanceToday.filter(a => a.status === 'ALPHA').length,
      total: attendanceToday.length
    }

    // Cek yang belum absen (Total Active Employees - Total Attendance Today)
    // Note: Ini kasar, karena employee mungkin libur/cuti. Tapi cukup untuk dashboard sederhana.
    const notAttendanceCount = Math.max(0, totalEmployees - attendanceStats.total)

    // 3. Loans Stats
    const activeLoans = await prisma.loan.findMany({
      where: { status: 'ACTIVE' },
      include: {
        payments: true
      }
    })

    let totalLoanOutstanding = 0
    activeLoans.forEach(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
      totalLoanOutstanding += (loan.amount - totalPaid)
    })

    // 4. Permissions (Pending)
    const pendingPermissions = await prisma.leaveRequest.count({
      where: { status: 'PENDING' }
    })

    // 5. Salary Estimation (Current Month)
    // Cek apakah sudah ada slip gaji bulan ini
    const currentMonth = now.getMonth() + 1 // 1-12
    const currentYear = now.getFullYear()

    const salarySlips = await prisma.salarySlip.aggregate({
      _sum: {
        netSalary: true
      },
      where: {
        month: currentMonth,
        year: currentYear
      }
    })

    const totalSalaryMonth = salarySlips._sum.netSalary || 0

    // Jika 0 (belum generate), mungkin bisa estimasi dari baseSalary employee aktif?
    // Untuk sekarang tampilkan apa adanya (0 jika belum generate)

    return {
      employees: {
        total: totalEmployees,
        newCount: newEmployeesCount,
        byStatus: employeeByStatus.map(e => ({ name: e.status, value: e._count })),
        byDept: employeeByDept.map(e => ({ name: e.department, value: e._count }))
      },
      attendance: {
        ...attendanceStats,
        notPresent: notAttendanceCount
      },
      loans: {
        activeCount: activeLoans.length,
        totalOutstanding: totalLoanOutstanding
      },
      permissions: {
        pendingCount: pendingPermissions
      },
      salary: {
        totalMonth: totalSalaryMonth
      }
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return null
  }
}
