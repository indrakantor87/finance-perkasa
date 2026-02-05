import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, differenceInHours } from 'date-fns'

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json()

    if (!employeeId) {
      return NextResponse.json({ error: 'ID Karyawan wajib diisi' }, { status: 400 })
    }

    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    // Find today's attendance
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Belum ada data check-in untuk hari ini' }, { status: 404 })
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: 'Sudah melakukan check-out hari ini' }, { status: 400 })
    }

    // Calculate overtime if applicable (e.g., check out after 17:00, or work > 9 hours)
    // Simplified logic: Overtime = hours worked - 9 hours (8 hours work + 1 hour break)
    // Or just strictly based on check-out time vs standard check-out time (17:00)
    
    let overtimeHours = 0
    if (attendance.checkIn) {
        const workedHours = differenceInHours(today, attendance.checkIn)
        if (workedHours > 9) {
            overtimeHours = workedHours - 9
        }
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: today,
        overtimeHours: overtimeHours > 0 ? overtimeHours : 0,
      },
    })

    return NextResponse.json(updatedAttendance)
  } catch (error) {
    console.error('Check-out error:', error)
    return NextResponse.json({ error: 'Kesalahan Server Internal' }, { status: 500 })
  }
}
