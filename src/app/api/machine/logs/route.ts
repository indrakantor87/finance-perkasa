import { NextResponse } from 'next/server';
import { executeZKCommand } from '@/lib/zk-service';

export const maxDuration = 60; // Allow longer timeout for fetching logs

export async function POST(req: Request) {
  try {
    const { userIds } = await req.json(); // userIds (string[]) to filter, or null/empty for all

    const logs = await executeZKCommand(async (zk) => {
      return await zk.getAttendances();
    });

    if (!logs || !logs.data) {
        return NextResponse.json({
            status: 'success',
            data: []
        });
    }

    let filteredLogs = logs.data;

    // Filter if specific users requested
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        filteredLogs = filteredLogs.filter((log: any) => userIds.includes(log.deviceUserId));
    }

    return NextResponse.json({
      status: 'success',
      data: filteredLogs
    });

  } catch (error: any) {
    console.error('Export Logs Error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
