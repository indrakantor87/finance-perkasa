import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { userIds } = await req.json(); // userIds (string[]) to filter
    
    const { exportLogs } = require('../../../../../scripts/export-logs.js');
    const result = await exportLogs({ userIds, throwOnError: true });

    if (result.status === 'success') {
      return NextResponse.json({
        status: 'success',
        data: result.data
      });
    }

    return NextResponse.json({
      status: 'error',
      message: result.message || 'Gagal mengekspor log mesin'
    }, { status: 500 });

  } catch (error: any) {
    console.error('Export Logs Error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
