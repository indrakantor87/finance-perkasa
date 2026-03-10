import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notification-service';
import { cookies } from 'next/headers';

// Helper to force TS check
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, level, reason, description, validUntil } = body;

    // Get employee name for notification
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true }
    });

    const warningLetter = await prisma.warningLetter.create({
      data: {
        employeeId,
        level: parseInt(level),
        reason,
        description,
        validUntil: new Date(validUntil),
        status: 'ACTIVE'
      },
    });

    // Create system notification
    if (employee) {
      await createNotification(
        `SP ${level} Diterbitkan`,
        `Surat Peringatan Tingkat ${level} telah diterbitkan untuk ${employee.name}. Alasan: ${reason}`,
        'warning',
        'employee'
      );
    }

    return NextResponse.json(warningLetter);
  } catch (error) {
    console.error('Error creating warning letter:', error);
    return NextResponse.json({ error: 'Error creating warning letter' }, { status: 500 });
  }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('perkasa-finance-auth')

        let sessionEmployeeId: string | null = null
        let sessionRole: string | null = null
        let sessionUserId: string | null = null
        let sessionEmail: string | null = null

        if (sessionCookie?.value) {
            try {
                const parsed = JSON.parse(sessionCookie.value)
                sessionEmployeeId = parsed.employeeId || null
                sessionRole = (parsed.role || '').toUpperCase()
                sessionUserId = parsed.id || null
                sessionEmail = parsed.email || null
            } catch {}
        }

        const isEmployee = sessionRole === 'EMPLOYEE' || sessionRole === 'KARYAWAN' || sessionRole === 'MARKETING'

        if (isEmployee) {
            if (!sessionEmployeeId && (sessionUserId || sessionEmail)) {
                try {
                    const userRecord = sessionUserId
                        ? await prisma.user.findUnique({ where: { id: sessionUserId } })
                        : await prisma.user.findUnique({ where: { email: sessionEmail! } })

                    if (userRecord?.employeeId) {
                        sessionEmployeeId = userRecord.employeeId
                    } else if (userRecord?.name) {
                        const exact = await prisma.employee.findFirst({ where: { name: userRecord.name } })
                        if (exact?.id) {
                            sessionEmployeeId = exact.id
                        } else {
                            const contains = await prisma.employee.findFirst({
                                where: { name: { contains: userRecord.name } }
                            })
                            if (contains?.id) sessionEmployeeId = contains.id
                        }
                    }
                } catch {}
            }

            const effectiveEmployeeId = sessionEmployeeId || employeeId || '__NONE__'
            const warningLetters = await prisma.warningLetter.findMany({
                where: { employeeId: effectiveEmployeeId },
                include: {
                    employee: {
                        select: {
                            name: true,
                            department: true,
                            whatsapp: true
                        }
                    }
                },
                orderBy: {
                    issuedDate: 'desc'
                }
            });

            const response = NextResponse.json(warningLetters);
            response.headers.set('Cache-Control', 'no-store')
            return response
        }

        const where = employeeId ? { employeeId } : {};

        const warningLetters = await prisma.warningLetter.findMany({
            where,
            include: {
                employee: {
                    select: {
                        name: true,
                        department: true,
                        whatsapp: true
                    }
                }
            },
            orderBy: {
                issuedDate: 'desc'
            }
        });

        const response = NextResponse.json(warningLetters);
        response.headers.set('Cache-Control', 'no-store')
        return response
    } catch (error) {
        console.error('Error fetching warning letters:', error);
        return NextResponse.json({ error: 'Error fetching warning letters' }, { status: 500 });
    }
}
