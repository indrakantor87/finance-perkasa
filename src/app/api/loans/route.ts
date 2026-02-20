import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIdParam = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')

    let sessionEmployeeId: string | null = null
    let sessionRole: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionEmployeeId = parsed.employeeId || null
        sessionRole = parsed.role || null
      } catch {
        // ignore invalid cookie
      }
    }

    const where: any = {}
    if (sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN') {
      // Karyawan hanya boleh melihat pinjaman sendiri
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

    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')

    let sessionEmployeeId: string | null = null
    let sessionRole: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionEmployeeId = parsed.employeeId || null
        sessionRole = parsed.role || null
      } catch {
        // ignore invalid cookie
      }
    }

    let targetEmployeeId = employeeId as string | null

    if (sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN') {
      // Karyawan hanya boleh mengajukan pinjaman untuk dirinya sendiri
      if (!sessionEmployeeId) {
        return NextResponse.json({ error: 'Profil karyawan belum terhubung' }, { status: 400 })
      }
      targetEmployeeId = sessionEmployeeId
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee tidak valid' }, { status: 400 })
    }

    const loan = await prisma.loan.create({
      data: {
        amount: parseFloat(amount),
        monthlyInstallment: parseFloat(monthlyInstallment),
        description,
        type: type || 'KASBON',
        date: new Date(date),
        employeeId: targetEmployeeId
      } as any
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
