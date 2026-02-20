import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
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
        console.error('Invalid auth cookie in notifications GET', error);
      }
    }

    const notifications = await prisma.notification.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    if ((role === 'EMPLOYEE' || role === 'KARYAWAN') && employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { name: true },
      });

      if (!employee) {
        return NextResponse.json([]);
      }

      const name = employee.name;
      const filtered = notifications.filter((n) => {
        const title = n.title ?? '';
        const message = n.message ?? '';
        return title.includes(name) || message.includes(name);
      });

      return NextResponse.json(filtered);
    }

    if (role === 'EMPLOYEE' || role === 'KARYAWAN') {
      return NextResponse.json([]);
    }

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, type, category } = body;

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'info',
        category: category || 'system',
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
