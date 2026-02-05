import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, monthlyInstallment, description, date, status } = body

    const loan = await prisma.loan.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        monthlyInstallment: parseFloat(monthlyInstallment),
        description,
        date: new Date(date),
        status
      }
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.loan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting loan:', error)
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
