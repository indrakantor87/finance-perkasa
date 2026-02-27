import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notification-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIdParam = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')

    let sessionEmployeeId: string | null = null
    let sessionRole: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionEmployeeId = parsed.employeeId || null
        sessionRole = (parsed.role || '').toUpperCase()
        // console.log('DEBUG API LOANS GET:', { sessionRole, sessionEmployeeId })
      } catch {
      }
    }

    const where: any = {}
    // Normalize role check
    const isEmployee = sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN' || sessionRole === 'MARKETING'
    
    if (isEmployee) {
      if (sessionEmployeeId) {
        where.employeeId = sessionEmployeeId
      } else if (employeeIdParam) {
        // Fallback: If session doesn't have employeeId (e.g. legacy data), use param
        // BUT verify if the user actually owns this employeeId (simplified check for now)
        where.employeeId = employeeIdParam
      } else {
        // Force empty result if employeeId is missing for employee role
        where.employeeId = '__NONE__'
      }
    } else if (employeeIdParam) {
      where.employeeId = employeeIdParam
    }
    
    if (status && status !== 'ALL') where.status = status

    // console.log('DEBUG API LOANS QUERY:', where)

    const loans = await prisma.loan.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            role: true,
            department: true
          }
        },
        payments: {
          orderBy: {
            date: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, monthlyInstallment, description, date, employeeId, type } = body

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')

    let sessionEmployeeId: string | null = null
    let sessionRole: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionEmployeeId = parsed.employeeId || null
        sessionRole = (parsed.role || '').toUpperCase()
      } catch {
      }
    }

    let targetEmployeeId = (employeeId as string | null) || null

    if (sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN' || sessionRole === 'MARKETING') {
      if (sessionEmployeeId) {
        targetEmployeeId = sessionEmployeeId
      } else if (targetEmployeeId) {
      } else {
        return NextResponse.json({ error: 'Profil karyawan belum terhubung' }, { status: 400 })
      }
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee tidak valid' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { role: true, name: true }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee tidak ditemukan' }, { status: 400 })
    }

    const amountNumber = Number(amount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'Jumlah pinjaman tidak valid' }, { status: 400 })
    }

    let monthlyInstallmentNumber = 0
    const normalizedType = type || 'KASBON'

    if (normalizedType === 'PINJAMAN') {
      monthlyInstallmentNumber = Number(monthlyInstallment)
      if (!Number.isFinite(monthlyInstallmentNumber) || monthlyInstallmentNumber <= 0) {
        return NextResponse.json({ error: 'Angsuran per bulan tidak valid' }, { status: 400 })
      }
    }

    if (normalizedType === 'PINJAMAN') {
      const roleName = (employee.role || '').toUpperCase()
      let plafon = 2000000
      if (roleName.includes('MANAGER')) {
        plafon = 5000000
      } else if (roleName.includes('SPV') || roleName.includes('SUPERVISOR') || roleName.includes('LEADER')) {
        plafon = 3000000
      }

      const activeLoans = await prisma.loan.findMany({
        where: {
          employeeId: targetEmployeeId,
          type: 'PINJAMAN',
          status: 'ACTIVE'
        },
        include: {
          payments: true
        }
      })

      let outstanding = 0
      activeLoans.forEach(loan => {
        const paid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
        outstanding += loan.amount - paid
      })

      const newTotal = outstanding + amountNumber

      if (newTotal > plafon) {
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        const plafonLabel = formatter.format(plafon)
        const remainingPlafon = Math.max(0, plafon - outstanding)
        const remainingLabel = formatter.format(remainingPlafon)
        return NextResponse.json(
          { error: `Pengajuan melebihi plafon pinjaman (${plafonLabel}). Sisa plafon: ${remainingLabel}.` },
          { status: 400 }
        )
      }
    }

    // Determine initial status based on role
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'DEVELOPER' || sessionRole === 'ADMINISTRATOR'
    const initialStatus = isAdmin ? 'ACTIVE' : 'PENDING'

    const loan = await prisma.loan.create({
      data: {
        amount: amountNumber,
        monthlyInstallment: monthlyInstallmentNumber,
        description,
        type: normalizedType,
        date: new Date(date),
        employeeId: targetEmployeeId,
        status: initialStatus
      }
    })

    const employeeName = employee.name || 'Karyawan'
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    })
    const amountLabel = formatter.format(amountNumber)
    const jenisLabel = normalizedType === 'KASBON' ? 'kasbon' : 'pinjaman'

    if (initialStatus === 'ACTIVE') {
      try {
        await createNotification(
          'Pengajuan Pinjaman/Kasbon Disetujui (Admin)',
          `Pengajuan ${jenisLabel} untuk ${employeeName} sebesar ${amountLabel} telah dibuat dan disetujui oleh admin.`,
          'success',
          'loan'
        )
      } catch (e) {
        console.error('Notification error:', e)
      }
    } else {
      try {
        await createNotification(
          'Pengajuan Pinjaman/Kasbon Baru',
          `Pengajuan ${jenisLabel} baru dari ${employeeName} sebesar ${amountLabel} menunggu persetujuan.`,
          'info',
          'loan'
        )
      } catch (e) {
        console.error('Notification error:', e)
      }
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
