import { NextResponse } from 'next/server';
import { executeZKCommand } from '@/lib/zk-service';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { uid, userId, name, role = 0, password = '', cardno = 0 } = body;

    if (!uid || !name) {
      return NextResponse.json({
        status: 'error',
        message: 'UID and Name are required'
      }, { status: 400 });
    }

    await executeZKCommand(async (zk) => {
      // setUser(uid, userid, name, password, role, cardno)
      await zk.setUser(uid, userId, name, password, role, cardno);
    });

    return NextResponse.json({
      status: 'success',
      message: `User ${name} updated successfully`
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
