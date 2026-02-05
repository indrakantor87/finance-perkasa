import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: any = {}
    if (employeeId) where.employeeId = employeeId
    if (status && status !== 'ALL') where.status = status

    const loans = await prisma.loan.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            role: true,
            department: true
          }
        },
        payments: {
          orderBy: {
            date: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, monthlyInstallment, description, date, employeeId } = body

    const loan = await prisma.loan.create({
      data: {
        amount: parseFloat(amount),
        monthlyInstallment: parseFloat(monthlyInstallment),
        description,
        date: new Date(date),
        employeeId
      }
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
