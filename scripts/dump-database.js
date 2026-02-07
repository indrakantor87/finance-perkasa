
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting database dump...');
    
    const dump = {
        metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
        },
        data: {}
    };

    try {
        // Fetch data from all models
        console.log('Fetching Employees...');
        dump.data.Employee = await prisma.employee.findMany();

        console.log('Fetching Attendance...');
        dump.data.Attendance = await prisma.attendance.findMany();

        console.log('Fetching SalarySlips...');
        dump.data.SalarySlip = await prisma.salarySlip.findMany();

        console.log('Fetching Loans...');
        dump.data.Loan = await prisma.loan.findMany();

        console.log('Fetching LoanPayments...');
        dump.data.LoanPayment = await prisma.loanPayment.findMany();

        console.log('Fetching LeaveRequests...');
        dump.data.LeaveRequest = await prisma.leaveRequest.findMany();
        
        console.log('Fetching SystemSettings...');
        dump.data.SystemSetting = await prisma.systemSetting.findMany();
        
        console.log('Fetching Users...');
        dump.data.User = await prisma.user.findMany();
        
        console.log('Fetching Notifications...');
        dump.data.Notification = await prisma.notification.findMany();

        // Write to JSON file
        const outputPath = path.join(__dirname, '..', 'database_dump.json');
        fs.writeFileSync(outputPath, JSON.stringify(dump, null, 2));
        console.log(`✅ Database dump saved to: ${outputPath}`);
        console.log(`Total Records:`);
        Object.keys(dump.data).forEach(key => {
            console.log(` - ${key}: ${dump.data[key].length}`);
        });

    } catch (e) {
        console.error('❌ Dump failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
