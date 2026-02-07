import { NextResponse } from 'next/server';
import { executeZKCommand } from '@/lib/zk-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({
        status: 'error',
        message: 'UID is required'
      }, { status: 400 });
    }

    await executeZKCommand(async (zk) => {
      // deleteUser takes uid
      await zk.deleteUser(parseInt(uid));
    });

    return NextResponse.json({
      status: 'success',
      message: `User with UID ${uid} deleted successfully`
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
