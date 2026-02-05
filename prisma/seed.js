const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create Employees
  const admin = await prisma.employee.upsert({
    where: { id: 'admin-01' },
    update: {},
    create: {
      id: 'admin-01',
      name: 'Admin Finance',
      role: 'ADMIN',
      baseSalary: 5000000,
      positionAllowance: 1000000,
    },
  })

  const manager = await prisma.employee.upsert({
    where: { id: 'mgr-01' },
    update: {},
    create: {
      id: 'mgr-01',
      name: 'Budi Manager',
      role: 'MANAGER',
      baseSalary: 8000000,
      positionAllowance: 2000000,
    },
  })

  const leader = await prisma.employee.upsert({
    where: { id: 'lead-01' },
    update: {},
    create: {
      id: 'lead-01',
      name: 'Siti Leader',
      role: 'LEADER',
      baseSalary: 6000000,
      positionAllowance: 1500000,
    },
  })

  const staff = await prisma.employee.upsert({
    where: { id: 'staff-01' },
    update: {},
    create: {
      id: 'staff-01',
      name: 'Andi Staff',
      role: 'STAFF',
      baseSalary: 4000000,
      positionAllowance: 0, // Staff no position allowance
    },
  })

  console.log({ admin, manager, leader, staff })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
