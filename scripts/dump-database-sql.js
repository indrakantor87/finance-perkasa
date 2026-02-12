
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function escapeSqlString(str) {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    if (typeof str === 'boolean') return str ? 1 : 0;
    if (str instanceof Date) {
        // Convert to MySQL format: YYYY-MM-DD HH:mm:ss.SSS
        return `'${str.toISOString().slice(0, 19).replace('T', ' ')}.${String(str.getMilliseconds()).padStart(3, '0')}'`;
    }
    // Escape single quotes by doubling them (Standard SQL)
    // Also escape backslashes for MySQL if needed, but usually doubling quotes is enough for text
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

async function generateInsertStatement(tableName, records) {
    if (!records || records.length === 0) return '';
    
    let sql = `-- Data for table: ${tableName}\n`;
    
    for (const record of records) {
        const keys = Object.keys(record);
        // Use backticks for MySQL identifiers
        const columns = keys.map(k => `\`${k}\``).join(', ');
        const values = keys.map(k => escapeSqlString(record[k])).join(', ');
        sql += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
    }
    
    return sql + '\n';
}

async function main() {
    console.log('Starting database SQL dump (MySQL format)...');
    
    const outputPath = path.join(__dirname, '..', 'database_dump.sql');
    let fullSql = `-- Database Dump generated at ${new Date().toISOString()}\n`;
    fullSql += `-- Target Database: MySQL\n\n`;
    
    // MySQL specific settings
    fullSql += 'SET FOREIGN_KEY_CHECKS = 0;\n';
    fullSql += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n';
    fullSql += 'SET time_zone = "+00:00";\n\n';

    try {
        const models = [
            'SystemSetting',
            'User',
            'Employee',
            'Attendance',
            'SalarySlip',
            'Loan',
            'LoanPayment',
            'LeaveRequest',
            'Notification',
            'WarningLetter'
        ];

        // Define dependency order or just dump all? 
        // With foreign_keys = OFF, order doesn't strictly matter for restore, 
        // but logical order is nice.
        // Order: SystemSetting, User, Employee (independentish), then dependent ones.

        for (const modelName of models) {
            console.log(`Fetching ${modelName}...`);
            // Access prisma delegate dynamically, e.g. prisma.employee
            // Prisma client properties are lowercase usually: prisma.employee
            const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            
            if (!prisma[modelKey]) {
                console.warn(`Model ${modelName} not found in Prisma client instance.`);
                continue;
            }

            const records = await prisma[modelKey].findMany();
            fullSql += await generateInsertStatement(modelName, records);
            console.log(` - ${modelName}: ${records.length} records`);
        }

        fullSql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';

        fs.writeFileSync(outputPath, fullSql);
        console.log(`✅ Database dump saved to: ${outputPath}`);

    } catch (e) {
        console.error('❌ Dump failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
