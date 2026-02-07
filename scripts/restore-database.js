
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting database restore...');
    
    const dumpPath = path.join(__dirname, '..', 'database_dump.json');
    if (!fs.existsSync(dumpPath)) {
        console.error('❌ Dump file not found:', dumpPath);
        process.exit(1);
    }

    const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
    console.log(`Loaded dump from ${dump.metadata.timestamp} (Version: ${dump.metadata.version})`);

    try {
        // 1. System Settings
        if (dump.data.SystemSetting && dump.data.SystemSetting.length > 0) {
            console.log(`Restoring ${dump.data.SystemSetting.length} SystemSettings...`);
            for (const item of dump.data.SystemSetting) {
                await prisma.systemSetting.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 2. Users
        if (dump.data.User && dump.data.User.length > 0) {
            console.log(`Restoring ${dump.data.User.length} Users...`);
            for (const item of dump.data.User) {
                await prisma.user.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 3. Employees
        if (dump.data.Employee && dump.data.Employee.length > 0) {
            console.log(`Restoring ${dump.data.Employee.length} Employees...`);
            for (const item of dump.data.Employee) {
                // Ensure dates are Date objects
                item.joinDate = new Date(item.joinDate);
                await prisma.employee.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 4. Attendance (Depends on Employee)
        if (dump.data.Attendance && dump.data.Attendance.length > 0) {
            console.log(`Restoring ${dump.data.Attendance.length} Attendance records...`);
            for (const item of dump.data.Attendance) {
                item.date = new Date(item.date);
                if (item.checkIn) item.checkIn = new Date(item.checkIn);
                if (item.checkOut) item.checkOut = new Date(item.checkOut);
                item.createdAt = new Date(item.createdAt);
                item.updatedAt = new Date(item.updatedAt);
                
                await prisma.attendance.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 5. Notifications
        if (dump.data.Notification && dump.data.Notification.length > 0) {
            console.log(`Restoring ${dump.data.Notification.length} Notifications...`);
            for (const item of dump.data.Notification) {
                item.createdAt = new Date(item.createdAt);
                await prisma.notification.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // Add other tables here if they have data in future...
        // SalarySlip, Loan, LeaveRequest, etc.

        console.log('✅ Database restore completed successfully!');

    } catch (e) {
        console.error('❌ Restore failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
