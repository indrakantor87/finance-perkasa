import { NextResponse } from 'next/server';
import { executeZKCommand, ZKUser } from '@/lib/zk-service';

export const dynamic = 'force-dynamic';

// GET: List all users from the machine
export async function GET() {
  try {
    const users = await executeZKCommand(async (zk) => {
      return await zk.getUsers();
    });

    return NextResponse.json({
      status: 'success',
      data: users?.data || [],
      count: users?.data?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}

// POST: Add a new user to the machine
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, role = 0, password = '', cardno = 0 } = body;

    if (!userId || !name) {
      return NextResponse.json({
        status: 'error',
        message: 'User ID and Name are required'
      }, { status: 400 });
    }

    // Convert userId to number for uid (internal machine ID) if possible, 
    // but zkteco-js setUser usually takes (uid, userId, name, password, role, cardno)
    // Note: 'uid' is an internal index, 'userId' is the displayed ID (e.g. employee number).
    // Often we can let uid be auto-assigned or manage it. 
    // However, zkteco-js setUser signature is typically: setUser(uid, userid, name, password, role, cardno)
    
    // We need to find a free uid if the machine requires unique uids manually.
    // Let's first get existing users to find max uid if needed, or just trust the input.
    // For safety, let's just pass the data.
    
    await executeZKCommand(async (zk) => {
      // Check if user exists first? Maybe.
      // setUser(uid, userid, name, password, role = 0, cardno = 0)
      // We'll use userId as uid as well if it's numeric and small enough, 
      // otherwise we might need a strategy. 
      // Usually fingerprint machines use 'uid' (internal 1-65535) and 'user_id' (string visible).
      
      // Strategy: Get all users, find max uid, increment by 1.
      const users = await zk.getUsers();
      const existingUids = users?.data?.map((u: any) => parseInt(u.uid)).filter((n: number) => !isNaN(n)) || [];
      const newUid = existingUids.length > 0 ? Math.max(...existingUids) + 1 : 1;
      
      // Execute setUser
      await zk.setUser(newUid, userId, name, password, role, cardno);
    });

    return NextResponse.json({
      status: 'success',
      message: `User ${name} (${userId}) added successfully`
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
