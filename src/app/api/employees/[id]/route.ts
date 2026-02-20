import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const { name, role, department, status, baseSalary, positionAllowance, joinDate, identityPhoto, whatsapp } = body

    const parsedBaseSalary = Number(baseSalary)
    const parsedPositionAllowance = Number(positionAllowance)

    if (isNaN(parsedBaseSalary)) throw new Error('Invalid baseSalary')
    if (isNaN(parsedPositionAllowance)) throw new Error('Invalid positionAllowance')

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        role,
        department,
        status,
        baseSalary: parsedBaseSalary,
        positionAllowance: parsedPositionAllowance,
        joinDate: new Date(joinDate),
        identityPhoto,
        whatsapp
      }
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error', details: error }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Delete all related records first using a transaction
    await prisma.$transaction([
      // 1. Delete Salary Slips
      prisma.salarySlip.deleteMany({
        where: { employeeId: id }
      }),
      // 2. Delete Attendances
      prisma.attendance.deleteMany({
        where: { employeeId: id }
      }),
      // 3. Delete Leave Requests
      prisma.leaveRequest.deleteMany({
        where: { employeeId: id }
      }),
      // 4. Delete Loans (Payments will be deleted automatically due to Cascade on Loan schema if configured, 
      //    but checking schema LoanPayment has onDelete: Cascade, so deleting Loan is enough)
      prisma.loan.deleteMany({
        where: { employeeId: id }
      }),
      // 5. Finally Delete Employee
      prisma.employee.delete({
        where: { id }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
