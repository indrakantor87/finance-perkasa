import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

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
        sessionRole = parsed.role || null
      } catch {
      }
    }

    const where: any = {}
    if (sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN') {
      if (sessionEmployeeId) {
        where.employeeId = sessionEmployeeId
      } else {
        where.employeeId = '__NONE__'
      }
    } else if (employeeIdParam) {
      where.employeeId = employeeIdParam
    }
    if (status && status !== 'ALL') where.status = status

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
        sessionRole = parsed.role || null
      } catch {
      }
    }

    let targetEmployeeId = (employeeId as string | null) || null

    if (sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN') {
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
      select: { role: true }
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

    const loan = await prisma.loan.create({
      data: {
        amount: amountNumber,
        monthlyInstallment: monthlyInstallmentNumber,
        description,
        type: normalizedType,
        date: new Date(date),
        employeeId: targetEmployeeId
      }
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
