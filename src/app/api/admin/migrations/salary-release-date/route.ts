import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('perkasa-finance-auth')

    let userRole: string | null = null

    if (authCookie) {
      try {
        const session = JSON.parse(authCookie.value)
        userRole = session.role ?? null
      } catch (error) {
        console.error('Invalid auth cookie in salary-release-date migration', error)
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEmployeeRole = userRole === 'KARYAWAN' || userRole === 'EMPLOYEE'

    if (isEmployeeRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE `SalarySlip` ADD COLUMN `releaseDate` DATETIME NULL'
      )

      return NextResponse.json({
        success: true,
        message: 'Kolom releaseDate berhasil dibuat di tabel SalarySlip',
      })
    } catch (error: any) {
      const message = String(error?.message || '')

      if (message.includes('Duplicate column name') || message.includes('already exists')) {
        return NextResponse.json({
          success: true,
          message: 'Kolom releaseDate sudah ada di tabel SalarySlip',
        })
      }

      console.error('Migration error (salary-release-date):', error)
      return NextResponse.json(
        { error: 'Migration failed. Silakan hubungi admin server.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in salary-release-date migration:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

