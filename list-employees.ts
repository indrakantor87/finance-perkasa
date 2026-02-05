
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const employees = await prisma.employee.findMany()
  console.log('All Employees:', employees)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
