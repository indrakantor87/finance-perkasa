import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

const computeStatusFromCheckIn = (checkIn: Date): 'PRESENT' | 'LATE' => {
  const WIB_OFFSET = 7 * 60 * 60 * 1000
  const wib = new Date(checkIn.getTime() + WIB_OFFSET)
  const hour = wib.getUTCHours()
  const minute = wib.getUTCMinutes()

  const isShift2 = hour > 17 || (hour === 17 && minute >= 0)
  const isLateMorning = !isShift2 && (hour > 8 || (hour === 8 && minute > 0))

  if (isLateMorning) return 'LATE'
  return 'PRESENT'
}

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json()

    if (!employeeId) {
      return NextResponse.json({ error: 'ID Karyawan wajib diisi' }, { status: 400 })
    }

    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    if (existingAttendance) {
      return NextResponse.json({ error: 'Sudah melakukan check-in hari ini' }, { status: 400 })
    }

    const status = computeStatusFromCheckIn(today)

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        checkIn: today,
        status,
      },
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Kesalahan Server Internal' }, { status: 500 })
  }
}
