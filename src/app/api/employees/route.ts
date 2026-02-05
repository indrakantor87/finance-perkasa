import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const department = searchParams.get('department')

  try {
    const whereClause = department ? { department } : {}
    
    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: { attendances: true }
        }
      }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('POST Request Body:', body) // Debug log

    const { name, role, department, status, baseSalary, positionAllowance, joinDate, identityPhoto } = body

    const parsedBaseSalary = Number(baseSalary) || 0
    const parsedPositionAllowance = Number(positionAllowance) || 0

    const employee = await prisma.employee.create({
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
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error', details: error }, { status: 500 })
  }
}
