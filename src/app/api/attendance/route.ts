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
    
    // Check if bulk create (array) or single create
    if (Array.isArray(body)) {
      // Bulk create logic for import
      // Expect body to be array of { employeeId, date, checkIn, checkOut, status }
      // Or we might need to upsert to avoid duplicates
      
      const calcOvertimeHours = (inDate: Date | null, outDate: Date | null) => {
        if (!inDate || !outDate) return 0
        let diffMin = Math.round((outDate.getTime() - inDate.getTime()) / 60000)
        if (diffMin < 0) diffMin += 24 * 60
        const overtimeMin = diffMin - (9 * 60)
        return overtimeMin > 0 ? parseFloat((overtimeMin / 60).toFixed(2)) : 0
      }

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
        const parseExtra = (val: any) => {
          if (typeof val === 'number') return val
          if (typeof val === 'string') {
            const n = parseFloat(val.replace(',', '.'))
            return isNaN(n) ? 0 : n
          }
          return 0
        }
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
          
          // Determine final extra hours
          // If hasExtra is true, use provided value (parseExtra(item.overtimeHours))
          // If hasExtra is false, we need to preserve existing EXTRA.
          // But existing.overtimeHours is TOTAL.
          // existingExtra = existing.overtimeHours - calcOvertimeHours(existing.checkIn, existing.checkOut)
          
          let finalExtra = 0
          if (hasExtra) {
            finalExtra = parseExtra(item.overtimeHours)
          } else {
            const oldComputed = calcOvertimeHours(existing.checkIn, existing.checkOut)
            finalExtra = Math.max(0, existing.overtimeHours - oldComputed)
          }
          
          const newOT = parseFloat((computedOT + (finalExtra >= 0 ? finalExtra : 0)).toFixed(2))

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
          const newOT = parseFloat((computedOT + (extra >= 0 ? extra : 0)).toFixed(2))
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
      const calcOvertimeHours = (inDate: Date | null, outDate: Date | null) => {
        if (!inDate || !outDate) return 0
        let diffMin = Math.round((outDate.getTime() - inDate.getTime()) / 60000)
        if (diffMin < 0) diffMin += 24 * 60
        const overtimeMin = diffMin - (9 * 60)
        return overtimeMin > 0 ? parseFloat((overtimeMin / 60).toFixed(2)) : 0
      }
      const computedOT = calcOvertimeHours(inDate, outDate)
      const parseExtra = (val: any) => {
        if (typeof val === 'number') return val
        if (typeof val === 'string') {
          const n = parseFloat(val.replace(',', '.'))
          return isNaN(n) ? 0 : n
        }
        return 0
      }
      const attendance = await prisma.attendance.create({
        data: {
          employeeId,
          date: new Date(date),
          checkIn: inDate,
          checkOut: outDate,
          status: status || 'PRESENT',
          overtimeHours: parseFloat((computedOT + parseExtra(overtimeHours)).toFixed(2))
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
