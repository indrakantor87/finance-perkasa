import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Indra' } },
        { role: 'KARYAWAN' },
        { role: 'EMPLOYEE' },
        { role: 'MARKETING' }
      ]
    },
    include: {
      employee: true
    }
  })

  console.log('--- USERS ---')
  console.dir(users, { depth: null })

  if (users.length > 0) {
    const employeeIds = users.map(u => u.employeeId).filter(id => id !== null) as string[]
    
    const loans = await prisma.loan.findMany({
      where: {
        employeeId: { in: employeeIds }
      }
    })

    console.log('--- LOANS FOR THESE USERS ---')
    console.dir(loans, { depth: null })
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
