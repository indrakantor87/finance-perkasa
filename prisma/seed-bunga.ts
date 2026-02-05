import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Bunga Citra...')
  
  // Create Bunga Citra (Marketing)
  const bunga = await prisma.employee.upsert({
    where: { id: 'mkt-01' }, // Using ID mkt-01 as per previous placeholder
    update: {
        name: 'Bunga Citra', // Ensure name matches
    },
    create: {
      id: 'mkt-01',
      name: 'Bunga Citra',
      role: 'STAFF', // Marketing Staff
      baseSalary: 4500000,
      positionAllowance: 0,
    },
  })

  console.log('Employee created:', bunga)

  // Create Attendance for Feb 2026
  // Assume she is diligent
  const year = 2026
  const month = 1 // Feb (0-indexed is 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  console.log(`Generating attendance for ${month + 1}/${year}...`)

  const attendanceData = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()

    // Skip Sunday (0)
    if (dayOfWeek === 0) continue

    attendanceData.push({
      date: date,
      checkIn: new Date(year, month, day, 8, 0),
      checkOut: new Date(year, month, day, 17, 0),
      status: 'PRESENT',
      employeeId: bunga.id,
      overtimeHours: dayOfWeek === 6 ? 0 : 1, // 1 hour overtime on weekdays, 0 on saturday
    })
  }

  for (const att of attendanceData) {
      await prisma.attendance.create({
          data: att
      })
  }

  console.log(`Created ${attendanceData.length} attendance records for Bunga Citra.`)
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
