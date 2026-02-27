import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Cari user Indra
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Indra' } }
  })

  if (!user) {
    console.log('User Indra tidak ditemukan!')
    return
  }

  console.log('User found:', user)

  // 2. Cari data Employee yang cocok (misalnya berdasarkan nama)
  const employee = await prisma.employee.findFirst({
    where: { name: { contains: 'Indra' } }
  })

  if (!employee) {
    console.log('Data Employee untuk Indra tidak ditemukan! Membuat baru...')
    // Opsional: Buat employee baru jika tidak ada
    const newEmployee = await prisma.employee.create({
      data: {
        name: 'Indra',
        role: 'STAFF',
        department: 'Marketing',
        baseSalary: 3000000,
        positionAllowance: 500000,
        joinDate: new Date()
      }
    })
    console.log('Employee baru dibuat:', newEmployee)
    
    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeId: newEmployee.id }
    })
    console.log('User Indra berhasil dihubungkan ke Employee ID:', newEmployee.id)
  } else {
    console.log('Employee found:', employee)
    
    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeId: employee.id }
    })
    console.log('User Indra berhasil dihubungkan ke Employee ID:', employee.id)
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
