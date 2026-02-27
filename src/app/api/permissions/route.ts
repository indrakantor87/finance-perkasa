import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notification-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    
    const where: any = {}
    if (employeeId) {
        where.employeeId = employeeId
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
    
    if (!employeeId || !type || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
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
      where: { id: employeeId },
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
