const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            select: { id: true, name: true }
        })
        console.log('DB Employees:', JSON.stringify(employees, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()