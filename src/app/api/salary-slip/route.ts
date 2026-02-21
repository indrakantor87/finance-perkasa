import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')
    
    let userRole: string | null = null
    let userEmployeeId: string | null = null
    let userId: string | null = null
    let userEmail: string | null = null

    if (authCookie) {
      try {
        const session = JSON.parse(authCookie.value)
        userRole = session.role ?? null
        userEmployeeId = session.employeeId ?? null
        userId = session.id ?? null
        userEmail = session.email ?? null
      } catch (error) {
        console.error('Invalid auth cookie in salary-slip GET', error)
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEmployeeRole = userRole === 'KARYAWAN' || userRole === 'EMPLOYEE'

    if (isEmployeeRole && !userEmployeeId) {
      try {
        let userRecord = null

        if (userId) {
          userRecord = await prisma.user.findUnique({
            where: { id: userId }
          })
        } else if (userEmail) {
          userRecord = await prisma.user.findUnique({
            where: { email: userEmail }
          })
        }

        if (userRecord) {
          if (userRecord.employeeId) {
            userEmployeeId = userRecord.employeeId
          } else if (userRecord.name) {
            const employees = await prisma.employee.findMany({
              where: {
                name: userRecord.name
              }
            })

            if (employees.length === 1) {
              userEmployeeId = employees[0].id
            }
          }
        }

        if (!userEmployeeId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      } catch (error) {
        console.error('Error resolving employeeId for employee role', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      }
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const category = searchParams.get('category') // 'Penjualan', 'Teknisi', 'Management'

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 })
    }

    // Build where clause
    const whereClause: any = {
      month: parseInt(month),
      year: parseInt(year),
    }

    // If user is KARYAWAN or EMPLOYEE, only show their own salary slips
    if (isEmployeeRole) {
      whereClause.employeeId = userEmployeeId
      whereClause.releaseDate = {
        lte: new Date(),
      }
    }

    const slips = await prisma.salarySlip.findMany({
      where: whereClause,
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

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')

    let userRole: string | null = null
    let userId: string | null = null
    let userEmail: string | null = null

    if (authCookie) {
      try {
        const session = JSON.parse(authCookie.value)
        userRole = session.role ?? null
        userId = session.id ?? null
        userEmail = session.email ?? null
      } catch (error) {
        console.error('Invalid auth cookie in salary-slip PATCH', error)
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEmployeeRole = userRole === 'KARYAWAN' || userRole === 'EMPLOYEE'

    if (isEmployeeRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, releaseDate } = body as { id?: string; releaseDate?: string }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const effectiveReleaseDate = releaseDate ? new Date(releaseDate) : new Date()

    const updated = await prisma.salarySlip.update({
      where: { id },
      data: {
        // Cast ke any supaya tidak tergantung tipe Prisma Client lama di environment ini
        releaseDate: effectiveReleaseDate,
      } as any,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating salary slip release status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')

    let session: { id?: string; email?: string; role?: string } | null = null
    if (authCookie) {
      try {
        session = JSON.parse(authCookie.value)
      } catch (e) {
        session = null
      }
    }
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
