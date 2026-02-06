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

    // Calculate overtime if applicable
    // Rule: Only if CheckIn > 17:00
    
    let overtimeHours = 0
    if (attendance.checkIn) {
        const checkInDate = new Date(attendance.checkIn)
        
        // WIB Conversion (UTC+7)
        const WIB_OFFSET = 7 * 60 * 60 * 1000
        const inDateWIB = new Date(checkInDate.getTime() + WIB_OFFSET)
        const inHour = inDateWIB.getUTCHours()
        const inMinute = inDateWIB.getUTCMinutes()
        
        const isLateCheckIn = inHour > 17 || (inHour === 17 && inMinute > 0)

        if (isLateCheckIn) {
            const durationMillis = today.getTime() - checkInDate.getTime()
            const durationMinutes = durationMillis / 60000
            if (durationMinutes > 0) {
                const h = Math.floor(durationMinutes / 60)
                const m = Math.round(durationMinutes % 60)
                overtimeHours = parseFloat(`${h}.${m.toString().padStart(2, '0')}`)
            }
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
