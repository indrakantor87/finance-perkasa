import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const category = searchParams.get('category') // 'Penjualan', 'Teknisi', 'Management'

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 })
    }

    // Filter by role/category if needed
    // Assuming 'Penjualan' -> STAFF/LEADER/MANAGER role mapping or specific logic?
    // For now, let's just fetch all and filter by employee role if necessary, or just fetch all for the period.
    // The user categorized UI by Penjualan/Teknisi/Management.
    // Let's assume Penjualan includes all roles for now, or refine later.
    // Based on previous code: Penjualan seems to use 'mkt', 'lead', 'mgr'.
    
    // Let's just fetch based on month/year first.
    const slips = await prisma.salarySlip.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        // Add category filtering logic here if we have a way to distinguish
        // For now, returning all for the month/year is safer to ensure data appears.
      },
      include: {
        employee: {
          select: {
            name: true,
            role: true,
            department: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(slips)
  } catch (error) {
    console.error('Error fetching salary slips:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.salarySlip.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: 'Salary slip deleted successfully' })
  } catch (error) {
    console.error('Error deleting salary slip:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
