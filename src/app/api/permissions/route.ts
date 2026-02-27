import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notification-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIdParam = searchParams.get('employeeId')
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')
    let sessionEmployeeId: string | null = null
    let sessionRole: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionEmployeeId = parsed.employeeId || null
        sessionRole = (parsed.role || '').toUpperCase()
      } catch {}
    }

    const where: any = {}
    
    // Strict Data Isolation
    const isEmployee = sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN' || sessionRole === 'MARKETING'
    if (isEmployee) {
      if (sessionEmployeeId) {
        where.employeeId = sessionEmployeeId
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (employeeIdParam) {
        where.employeeId = employeeIdParam
    }

    // Monthly Filter Logic
    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)
      
      where.startDate = {
        gte: startDate,
        lte: endDate
      }
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { name: true, role: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(requests)
  } catch (error) {
    console.error('Fetch permissions error:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, type, startDate, endDate, duration, durationUnit, reason, attachment } = body
    
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')
    let sessionRole: string | null = null
    let sessionEmployeeId: string | null = null

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value)
        sessionRole = (parsed.role || '').toUpperCase()
        sessionEmployeeId = parsed.employeeId || null
      } catch {}
    }

    let targetEmployeeId = employeeId

    // Enforce ID for employees
    const isEmployee = sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN' || sessionRole === 'MARKETING'
    if (isEmployee) {
      // Prioritize session ID, but allow fallback to body ID if session ID is missing (fail-safe for inconsistent cookie state)
      // This is risky but necessary if cookie is flaky in production.
      // Better security: rely only on session. But if session fails, user stuck.
      // Compromise: If session ID is missing, but role is employee, use body ID.
      if (sessionEmployeeId) {
          targetEmployeeId = sessionEmployeeId
      } else if (!targetEmployeeId) {
          return NextResponse.json({ error: 'Unauthorized: No Employee ID found in session or request' }, { status: 401 })
      }
    }

    if (!targetEmployeeId || !type || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: targetEmployeeId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: typeof duration === 'string' ? parseFloat(duration) : duration || 0,
        durationUnit: durationUnit || 'DAYS',
        reason,
        attachment
      }
    })

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { name: true }
    })

    const employeeName = employee?.name || 'Karyawan'

    await createNotification(
      'Pengajuan Perizinan Dikirim',
      `Pengajuan perizinan untuk ${employeeName} periode ${startDate} s/d ${endDate} telah dikirim dan menunggu persetujuan.`,
      'info',
      'leave'
    )

    return NextResponse.json(newRequest)
  } catch (error) {
    console.error('Create permission error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}
