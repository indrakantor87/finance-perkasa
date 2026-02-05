import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('PUT Request Body:', body) // Debug log

    const { name, role, department, status, baseSalary, positionAllowance, joinDate, identityPhoto } = body

    // Validation for numbers
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
        identityPhoto
      }
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    // Return detailed error for debugging
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error', details: error }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.employee.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
