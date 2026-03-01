import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

const computeStatusFromCheckIn = (checkIn: Date | null): 'PRESENT' | 'LATE' => {
  if (!checkIn) return 'PRESENT'
  const WIB_OFFSET = 7 * 60 * 60 * 1000
  const wib = new Date(checkIn.getTime() + WIB_OFFSET)
  const hour = wib.getUTCHours()
  const minute = wib.getUTCMinutes()

  const isShift2 = hour > 17 || (hour === 17 && minute >= 0)
  const isLateMorning = !isShift2 && (hour > 8 || (hour === 8 && minute > 0))

  if (isLateMorning) return 'LATE'
  return 'PRESENT'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const date = searchParams.get('date') // YYYY-MM-DD
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')

    const where: any = {}

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      end.setHours(23, 59, 59, 999)
      where.date = {
        gte: start,
        lte: end
      }
    } else if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = {
        gte: startDate,
        lte: endDate
      }
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      where.date = {
        gte: startDate,
        lte: endDate
      }
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            role: true,
            department: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(attendances)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')

    let session: { id?: string; email?: string; role?: string } | null = null
    if (authCookie) {
      try {
        session = JSON.parse(authCookie.value)
      } catch (e) {
        session = null
      }
    }

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const ip = ipHeader.split(',')[0].trim() || null

    const toMinutes = (dotFormat: number) => {
      const h = Math.floor(dotFormat)
      const m = Math.round((dotFormat - h) * 100)
      return h * 60 + m
    }

    const toDotFormat = (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = Math.round(minutes % 60)
      return parseFloat(`${h}.${m.toString().padStart(2, '0')}`)
    }

    const calcOvertimeHours = (inDate: Date | null, outDate: Date | null) => {
      if (!inDate || !outDate) return 0
      
      const durationMillis = outDate.getTime() - inDate.getTime()
      const durationMinutes = Math.floor(durationMillis / 60000)
      if (durationMinutes <= 0) return 0
      
      const WIB_OFFSET = 7 * 60 * 60 * 1000
      const inDateWIB = new Date(inDate.getTime() + WIB_OFFSET)
      const outDateWIB = new Date(outDate.getTime() + WIB_OFFSET)
      
      const inHour = inDateWIB.getUTCHours()
      const inMinute = inDateWIB.getUTCMinutes()
      
      let overtimeMinutes = 0

      // Shift 2 (masuk >= 17:00 WIB) mengikuti jam kerja 9 jam
      if (inHour > 17 || (inHour === 17 && inMinute >= 0)) {
        const WORK_MINUTES_SHIFT2 = 9 * 60
        overtimeMinutes = Math.max(0, durationMinutes - WORK_MINUTES_SHIFT2)
      } else {
        const standardExitWIB = new Date(inDateWIB)
        standardExitWIB.setUTCHours(17, 0, 0, 0)

        if (outDateWIB.getTime() > standardExitWIB.getTime()) {
          overtimeMinutes = Math.floor((outDateWIB.getTime() - standardExitWIB.getTime()) / 60000)

          const scheduledStartWIB = new Date(inDateWIB)
          scheduledStartWIB.setUTCHours(8, 0, 0, 0)

          let lateMinutes = 0
          if (inDateWIB.getTime() > scheduledStartWIB.getTime()) {
            lateMinutes = Math.floor((inDateWIB.getTime() - scheduledStartWIB.getTime()) / 60000)
          }

          overtimeMinutes = Math.max(0, overtimeMinutes - lateMinutes)
        }
      }

      if (overtimeMinutes > durationMinutes) {
        overtimeMinutes = durationMinutes
      }

      if (overtimeMinutes <= 0) return 0
      return toDotFormat(overtimeMinutes)
    }

    const calcOvertimeDecimal = (inDate: Date | null, outDate: Date | null) => {
      if (!inDate || !outDate) return 0
      const dotFormat = calcOvertimeHours(inDate, outDate)
      return toMinutes(dotFormat) / 60
    }

    const parseExtra = (val: any) => {
      if (typeof val === 'number') return val
      if (typeof val === 'string') {
        const n = parseFloat(val.replace(',', '.'))
        return isNaN(n) ? 0 : n
      }
      return 0
    }
    
    // Check if bulk create (array) or single create
    if (Array.isArray(body)) {
      // Bulk create logic for import
      // Expect body to be array of { employeeId, date, checkIn, checkOut, status }
      
      const results = []
      for (const item of body) {
        const normalizeDateOnly = (val: any) => {
          if (!val) return null
          if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0]
          const s = val.toString()
          const d = new Date(s)
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
          const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
          if (m) return m[1]
          return null
        }
        const dateOnlyStr = normalizeDateOnly(item.date)
        if (!dateOnlyStr && !item.id) throw new Error('Invalid date provided')
        const date = dateOnlyStr ? new Date(`${dateOnlyStr}T00:00:00.000Z`) : undefined
        const hasCheckIn = 'checkIn' in item
        const hasCheckOut = 'checkOut' in item
        const hasExtra = 'overtimeHours' in item
        const hasLockFlag = 'lockedByAdmin' in item
        let checkIn = hasCheckIn ? (item.checkIn ? new Date(item.checkIn) : null) : undefined
        let checkOut = hasCheckOut ? (item.checkOut ? new Date(item.checkOut) : null) : undefined
        if (checkIn instanceof Date && isNaN(checkIn.getTime())) {
          checkIn = null
        }
        if (checkOut instanceof Date && isNaN(checkOut.getTime())) {
          checkOut = null
        }
        let computedOT = 0
        const extra = hasExtra ? parseExtra(item.overtimeHours) : 0
        
        // Find existing attendance for this employee on this date
        const startOfDay = dateOnlyStr ? new Date(`${dateOnlyStr}T00:00:00.000Z`) : undefined
        const endOfDay = dateOnlyStr ? new Date(`${dateOnlyStr}T23:59:59.999Z`) : undefined

        let existing
        if (item.id) {
          existing = await prisma.attendance.findUnique({ where: { id: item.id } })
        } else {
          existing = await prisma.attendance.findFirst({
            where: {
              employeeId: item.employeeId,
              date: {
                gte: startOfDay!,
                lte: endOfDay!
              }
            }
          })
        }

        if (existing) {
          const wantsLock = hasLockFlag && item.lockedByAdmin === true
          if (existing.lockedByAdmin && !wantsLock) {
            results.push(existing)
            continue
          }

          let finalCheckIn = hasCheckIn ? (checkIn ?? null) : existing.checkIn
          let finalCheckOut = hasCheckOut ? (checkOut ?? null) : existing.checkOut
          
          // Guard: if equal timestamps, drop checkOut
          if (finalCheckIn && finalCheckOut && finalCheckIn.getTime() === finalCheckOut.getTime()) {
            finalCheckOut = null
          }
          
          const computedOT = calcOvertimeHours(finalCheckIn, finalCheckOut)

          let newOT = computedOT
          if (hasExtra) {
            const finalExtra = parseExtra(item.overtimeHours)
            const computedOTMin = toMinutes(computedOT)
            const finalExtraMin = toMinutes(finalExtra)
            newOT = toDotFormat(computedOTMin + finalExtraMin)
          }

          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              checkIn: finalCheckIn,
              checkOut: finalCheckOut,
              status: item.status || existing.status,
              overtimeHours: newOT
            }
          })

          results.push(updated)
        } else {
          computedOT = calcOvertimeHours(checkIn ?? null, checkOut ?? null)
          const computedOTMin = toMinutes(computedOT)
          const extraMin = toMinutes(extra)
          const newOT = toDotFormat(computedOTMin + extraMin)
          const statusValue =
            item.status && typeof item.status === 'string'
              ? item.status
              : computeStatusFromCheckIn(checkIn ?? null)

          const created = await prisma.attendance.create({
            data: {
              date: startOfDay!,
              employeeId: item.employeeId,
              checkIn: checkIn ?? null,
              checkOut: checkOut ?? null,
              status: statusValue,
              overtimeHours: newOT
            }
          })

          results.push(created)
        }
      }
      return NextResponse.json({ message: 'Bulk import successful', count: results.length })
    } else {
      // Single create
      const { employeeId, date, checkIn, checkOut, status, overtimeHours, lockedByAdmin } = body
      let inDate = checkIn ? new Date(checkIn) : null
      let outDate = checkOut ? new Date(checkOut) : null
      
      if (inDate && outDate && inDate.getTime() === outDate.getTime()) {
        outDate = null
      }
      
      const computedOT = calcOvertimeHours(inDate, outDate)
      const computedOTMin = toMinutes(computedOT)
      const extraMin = toMinutes(parseExtra(overtimeHours))
      const newOT = toDotFormat(computedOTMin + extraMin)

      // Check if exists
      const dateObj = new Date(date)
      const dateStr = dateObj.toISOString().split('T')[0]
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

      const existing = await prisma.attendance.findFirst({
        where: {
            employeeId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
      })

      const statusValue =
        status && typeof status === 'string'
          ? status
          : computeStatusFromCheckIn(inDate)

      if (existing) {
        const wantsLock = lockedByAdmin === true
        if (existing.lockedByAdmin && !wantsLock) {
          return NextResponse.json(existing)
        }

        const attendance = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn: inDate || existing.checkIn,
            checkOut: outDate || existing.checkOut,
            status: status || existing.status || statusValue,
            overtimeHours: newOT
          }
        })

        return NextResponse.json(attendance)
      } else {
        // Create new
        const attendance = await prisma.attendance.create({
          data: {
            employeeId,
            date: startOfDay,
            checkIn: inDate,
            checkOut: outDate,
            status: statusValue,
            overtimeHours: newOT
          }
        })

        return NextResponse.json(attendance)
      }
    }
  } catch (error) {
    console.error('Error creating/updating attendance:', error)
    const msg = (error as any)?.message || 'Failed to create/update attendance'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')

    let session: { id?: string; email?: string; role?: string } | null = null
    if (authCookie) {
      try {
        session = JSON.parse(authCookie.value)
      } catch (e) {
        session = null
      }
    }

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const ip = ipHeader.split(',')[0].trim() || null
    const employeeId = searchParams.get('employeeId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    const where: any = {
      employeeId
    }

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      end.setHours(23, 59, 59, 999)
      where.date = {
        gte: start,
        lte: end
      }
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      where.date = {
        gte: startDate,
        lte: endDate
      }
    } else {
      return NextResponse.json({ error: 'Date range or Month/Year is required' }, { status: 400 })
    }

    const result = await prisma.attendance.deleteMany({
      where
    })

    return NextResponse.json({ message: 'Attendance records deleted', count: result.count })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 })
  }
}
