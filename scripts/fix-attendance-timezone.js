const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const HOURS_TO_SHIFT = -7
  const fromDate = process.env.FIX_FROM_DATE || '2026-02-01'

  console.log('=== Fix Attendance Timezone ===')
  console.log(`Shifting checkIn/checkOut by ${HOURS_TO_SHIFT} hours starting from ${fromDate}`)

  const from = new Date(`${fromDate}T00:00:00.000Z`)

  const records = await prisma.attendance.findMany({
    where: {
      date: {
        gte: from,
      },
    },
    orderBy: { date: 'asc' },
  })

  console.log(`Found ${records.length} attendance records to inspect`)

  const shiftMs = HOURS_TO_SHIFT * 60 * 60 * 1000
  let updated = 0

  for (const att of records) {
    let { checkIn, checkOut } = att
    let needsUpdate = false

    if (checkIn) {
      const shifted = new Date(checkIn.getTime() + shiftMs)
      checkIn = shifted
      needsUpdate = true
    }

    if (checkOut) {
      const shifted = new Date(checkOut.getTime() + shiftMs)
      checkOut = shifted
      needsUpdate = true
    }

    if (!needsUpdate) continue

    await prisma.attendance.update({
      where: { id: att.id },
      data: {
        checkIn,
        checkOut,
      },
    })

    updated++
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} records...`)
    }
  }

  console.log(`Done. Updated ${updated} attendance records.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

