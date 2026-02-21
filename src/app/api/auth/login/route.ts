
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

type RateLimitEntry = {
  count: number
  firstAttemptAt: number
}

const loginRateLimitStore = new Map<string, RateLimitEntry>()

const WINDOW_MINUTES = 5
const MAX_ATTEMPTS = 5
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const ip = ipHeader.split(',')[0].trim() || 'unknown'

    const now = Date.now()
    const current = loginRateLimitStore.get(ip)

    if (current && now - current.firstAttemptAt < WINDOW_MS && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' },
        { status: 429 }
      )
    }

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
      const existing = loginRateLimitStore.get(ip)
      if (!existing || now - existing.firstAttemptAt >= WINDOW_MS) {
        loginRateLimitStore.set(ip, { count: 1, firstAttemptAt: now })
      } else {
        loginRateLimitStore.set(ip, { count: existing.count + 1, firstAttemptAt: existing.firstAttemptAt })
      }
      return NextResponse.json({ error: 'Email atau kata sandi salah' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      const existing = loginRateLimitStore.get(ip)
      if (!existing || now - existing.firstAttemptAt >= WINDOW_MS) {
        loginRateLimitStore.set(ip, { count: 1, firstAttemptAt: now })
      } else {
        loginRateLimitStore.set(ip, { count: existing.count + 1, firstAttemptAt: existing.firstAttemptAt })
      }
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

    loginRateLimitStore.delete(ip)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
