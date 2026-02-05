
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Attempting to create employee...')
    const employee = await prisma.employee.create({
      data: {
        name: 'Test Employee',
        role: 'Penjualan',
        department: 'Penjualan',
        status: 'Karyawan',
        baseSalary: 4000000,
        positionAllowance: 0,
        joinDate: new Date(),
      }
    })
    console.log('Employee created successfully:', employee)
  } catch (error) {
    console.error('Error creating employee:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
