import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json()

    if (!employeeId) {
      return NextResponse.json({ error: 'ID Karyawan wajib diisi' }, { status: 400 })
    }

    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    // Check if already checked in
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

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        checkIn: today,
        status: 'PRESENT',
      },
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Kesalahan Server Internal' }, { status: 500 })
  }
}
