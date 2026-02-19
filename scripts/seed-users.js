const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('123456', 10)

  const users = [
    {
      email: 'developer@perkasa.net.id',
      name: 'Developer',
      role: 'DEVELOPER',
      password
    },
    {
      email: 'administrator@perkasa.net.id',
      name: 'Administrator',
      role: 'ADMINISTRATOR',
      password
    },
    {
      email: 'admin@perkasa.net.id',
      name: 'Admin',
      role: 'ADMIN',
      password
    },
    {
      email: 'administrator@test.com',
      name: 'Administrator (Legacy)',
      role: 'ADMINISTRATOR',
      password
    },
    {
      email: 'admin@test.com',
      name: 'Admin (Legacy)',
      role: 'ADMIN',
      password
    }
  ]

  console.log('Start seeding users...')

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: u.password,
        role: u.role,
        name: u.name
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: u.password
      }
    })
    console.log(`Created/Updated user: ${user.email} with role ${user.role}`)
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

