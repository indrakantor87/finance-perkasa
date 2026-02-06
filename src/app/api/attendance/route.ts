import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
      
      // Convert to WIB (UTC+7) to check for 17:00 limit
      const WIB_OFFSET = 7 * 60 * 60 * 1000
      const inDateWIB = new Date(inDate.getTime() + WIB_OFFSET)
      const inHour = inDateWIB.getUTCHours()
      const inMinute = inDateWIB.getUTCMinutes()
      
      const isLateCheckIn = inHour > 17 || (inHour === 17 && inMinute > 0)
      
      if (isLateCheckIn) {
        const totalDuration = (outDate.getTime() - inDate.getTime()) / 60000
        if (totalDuration <= 0) return 0
        return toDotFormat(totalDuration)
      }
      
      return 0
    }

    const calcOvertimeDecimal = (inDate: Date | null, outDate: Date | null) => {
      if (!inDate || !outDate) return 0
      
      // Convert to WIB (UTC+7) to check for 17:00 limit
      const WIB_OFFSET = 7 * 60 * 60 * 1000
      const inDateWIB = new Date(inDate.getTime() + WIB_OFFSET)
      const inHour = inDateWIB.getUTCHours()
      const inMinute = inDateWIB.getUTCMinutes()
      
      const isLateCheckIn = inHour > 17 || (inHour === 17 && inMinute > 0)
      
      if (isLateCheckIn) {
        let diffMin = Math.round((outDate.getTime() - inDate.getTime()) / 60000)
        if (diffMin < 0) diffMin += 24 * 60
        // Entire duration is overtime for late shift
        return diffMin > 0 ? parseFloat((diffMin / 60).toFixed(2)) : 0
      }
      
      return 0
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
          // Calculate new overtime carefully
          const finalCheckIn = hasCheckIn ? (checkIn ?? null) : existing.checkIn
          const finalCheckOut = hasCheckOut ? (checkOut ?? null) : existing.checkOut
          
          const computedOT = calcOvertimeHours(finalCheckIn, finalCheckOut)
          
          let finalExtra = 0
          if (hasExtra) {
            finalExtra = parseExtra(item.overtimeHours)
          } else {
            // Recalculate based on existing data to find "extra"
            const oldComputedDecimal = calcOvertimeDecimal(existing.checkIn, existing.checkOut)
            const newComputedDot = calcOvertimeHours(existing.checkIn, existing.checkOut)
            
            if (Math.abs(existing.overtimeHours - oldComputedDecimal) < 0.01) {
               finalExtra = 0
            } 
            else if (Math.abs(toMinutes(existing.overtimeHours) - toMinutes(newComputedDot)) < 1) {
               finalExtra = 0
            }
            else {
               const extraFromDecimal = Math.max(0, existing.overtimeHours - oldComputedDecimal)
               const extraMin = Math.round(extraFromDecimal * 60)
               finalExtra = toDotFormat(extraMin)
            }
          }
          
          const computedOTMin = toMinutes(computedOT)
          const finalExtraMin = toMinutes(finalExtra)
          const newOT = toDotFormat(computedOTMin + finalExtraMin)

          // Update
          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              checkIn: hasCheckIn ? (checkIn ?? null) : existing.checkIn,
              checkOut: hasCheckOut ? (checkOut ?? null) : existing.checkOut,
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
          // Create
          const created = await prisma.attendance.create({
            data: {
              date: startOfDay!,
              employeeId: item.employeeId,
              checkIn: checkIn ?? null,
              checkOut: checkOut ?? null,
              status: item.status || 'PRESENT',
              overtimeHours: newOT
            }
          })
          results.push(created)
        }
      }
      return NextResponse.json({ message: 'Bulk import successful', count: results.length })
    } else {
      // Single create
      const { employeeId, date, checkIn, checkOut, status, overtimeHours } = body
      const inDate = checkIn ? new Date(checkIn) : null
      const outDate = checkOut ? new Date(checkOut) : null
      
      const computedOT = calcOvertimeHours(inDate, outDate)
      const computedOTMin = toMinutes(computedOT)
      const extraMin = toMinutes(parseExtra(overtimeHours))
      const newOT = toDotFormat(computedOTMin + extraMin)
      
      const attendance = await prisma.attendance.create({
        data: {
          employeeId,
          date: new Date(date),
          checkIn: inDate,
          checkOut: outDate,
          status: status || 'PRESENT',
          overtimeHours: newOT
        }
      })
      return NextResponse.json(attendance)
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
