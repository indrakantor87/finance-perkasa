import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params // loanId
    const body = await request.json()
    const { amount, date, note } = body

    const payment = await prisma.loanPayment.create({
      data: {
        loanId: id,
        amount: parseFloat(amount),
        date: new Date(date),
        note
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
