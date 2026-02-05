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
      
      const results = []
      for (const item of body) {
        const date = new Date(item.date)
        const checkIn = item.checkIn ? new Date(item.checkIn) : null
        const checkOut = item.checkOut ? new Date(item.checkOut) : null
        
        // Find existing attendance for this employee on this date
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const existing = await prisma.attendance.findFirst({
          where: {
            employeeId: item.employeeId,
            date: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })

        if (existing) {
          // Update
          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              checkIn: checkIn || existing.checkIn,
              checkOut: checkOut || existing.checkOut,
              status: item.status || existing.status,
              overtimeHours: item.overtimeHours || existing.overtimeHours
            }
          })
          results.push(updated)
        } else {
          // Create
          const created = await prisma.attendance.create({
            data: {
              date: startOfDay,
              employeeId: item.employeeId,
              checkIn: checkIn,
              checkOut: checkOut,
              status: item.status || 'PRESENT',
              overtimeHours: item.overtimeHours || 0
            }
          })
          results.push(created)
        }
      }
      return NextResponse.json({ message: 'Bulk import successful', count: results.length })
    } else {
      // Single create
      const { employeeId, date, checkIn, checkOut, status, overtimeHours } = body
      const attendance = await prisma.attendance.create({
        data: {
          employeeId,
          date: new Date(date),
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          status: status || 'PRESENT',
          overtimeHours: overtimeHours || 0
        }
      })
      return NextResponse.json(attendance)
    }
  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 })
  }
}
