import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json()
    const { status } = body
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status }
    })
    
    // AUTO-UPDATE ATTENDANCE LOGIC
    if (status === 'APPROVED') {
      const { startDate, endDate, employeeId, type } = updatedRequest
      
      // Determine Attendance Status
      // SICK -> SICK
      // OTHERS -> PERMIT
      const attendanceStatus = type === 'SICK' ? 'SICK' : 'PERMIT'
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Iterate through each day of the leave
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Create specific date boundaries for query to ensure correct day matching
        const dayStart = new Date(d)
        dayStart.setUTCHours(0, 0, 0, 0)
        const dayEnd = new Date(d)
        dayEnd.setUTCHours(23, 59, 59, 999)
        
        // Check if attendance exists for this day
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                employeeId,
                date: {
                    gte: dayStart,
                    lte: dayEnd
                }
            }
        })

        if (existingAttendance) {
            // Update existing record
            await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: { status: attendanceStatus }
            })
        } else {
            // Create new record
            await prisma.attendance.create({
                data: {
                    date: dayStart,
                    employeeId,
                    status: attendanceStatus,
                    checkIn: null,
                    checkOut: null
                }
            })
        }
      }
    }
    
    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Update permission error:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await prisma.leaveRequest.delete({
      where: { id: params.id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete permission error:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}
