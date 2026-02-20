import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('perkasa-finance-auth');
    let role: string | null = null;
    let employeeId: string | null = null;

    if (authCookie) {
      try {
        const session = JSON.parse(authCookie.value);
        role = session.role ?? null;
        employeeId = session.employeeId ?? null;
      } catch (error) {
        console.error('Invalid auth cookie in notifications mark-read', error);
      }
    }

    if (role === 'EMPLOYEE' || role === 'KARYAWAN') {
      if (!employeeId) {
        return NextResponse.json({ success: true });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { name: true },
      });

      if (!employee) {
        return NextResponse.json({ success: true });
      }

      const name = employee.name;

      await prisma.notification.updateMany({
        where: {
          isRead: false,
          OR: [
            { title: { contains: name } },
            { message: { contains: name } },
          ],
        },
        data: {
          isRead: true,
        },
      });
    } else {
      await prisma.notification.updateMany({
        where: {
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
