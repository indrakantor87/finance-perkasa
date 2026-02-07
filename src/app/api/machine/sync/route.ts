import { NextResponse } from 'next/server';
import { executeZKCommand } from '@/lib/zk-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer timeout for sync

export async function POST() {
  try {
    const machineUsers = await executeZKCommand(async (zk) => {
      return await zk.getUsers();
    });

    if (!machineUsers?.data || machineUsers.data.length === 0) {
      return NextResponse.json({
        status: 'warning',
        message: 'No users found in machine to sync'
      });
    }

    const users = machineUsers.data;
    let syncedCount = 0;
    let skippedCount = 0;
    let errors: string[] = [];
    let skippedDetails: string[] = [];

    // Process sequentially to avoid DB connection pool exhaustion if many users
    for (const user of users) {
      try {
        // Validate name - prevent syncing if name is just a number or empty
        const isNumericName = /^\d+$/.test(user.name);
        const isEmptyName = !user.name || user.name.trim() === '';
        
        if (isNumericName || isEmptyName) {
            skippedCount++;
            skippedDetails.push(`${user.userId} (Nama tidak valid: "${user.name}")`);
            continue;
        }

        // We match by name because machine doesn't have our DB ID
        // and our DB ID is UUID while machine ID is numeric/string
        const existing = await prisma.employee.findFirst({
          where: {
            name: {
              equals: user.name,
              mode: 'insensitive' // Case insensitive match
            }
          }
        });

        if (!existing) {
          await prisma.employee.create({
            data: {
              name: user.name,
              role: 'STAFF', // Default role
              department: 'Pemasaran dan Pelayanan', // Default department, can be changed later
              status: 'Karyawan', // Default status
              joinDate: new Date(),
              // We could store the machine ID if we had a field for it, 
              // but for now we just create the employee
            }
          });
          syncedCount++;
        }
      } catch (err: any) {
        console.error(`Failed to sync user ${user.name}:`, err);
        errors.push(`${user.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Berhasil menarik ${syncedCount} karyawan baru.${skippedCount > 0 ? ` ${skippedCount} user dilewati karena nama tidak valid (angka/kosong).` : ''}`,
      details: {
        totalMachineUsers: users.length,
        newlyCreated: syncedCount,
        skippedCount: skippedCount,
        skippedDetails: skippedDetails,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
