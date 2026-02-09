
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib diisi' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Email atau kata sandi salah' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Email atau kata sandi salah' }, { status: 401 })
    }

    // Return user info excluding password
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        // If user is linked to employee, use employee info, otherwise use user info
        employeeId: user.employeeId,
        employeeName: user.employee?.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
