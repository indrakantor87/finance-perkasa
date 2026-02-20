
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

    const responseUser = {
      ...userWithoutPassword,
      employeeId: user.employeeId,
      employeeName: user.employee?.name,
      role: user.role
    }

    const sessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId
    }

    const response = NextResponse.json({
      user: responseUser
    })

    response.cookies.set('perkasa-finance-auth', JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
