const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting manual fix for Dwi (08 & 19 Feb 2026)...')

    const employee = await prisma.employee.findFirst({
      where: { name: { equals: 'Dwi', mode: 'insensitive' } }
    })

    if (!employee) {
      console.log('Employee "Dwi" not found. Abort.')
      return
    }

    const targets = [
      { date: '2026-02-08', shiftHours: 7 },
      { date: '2026-02-19', shiftHours: 7 }
    ]

    for (const t of targets) {
      const startOfDay = new Date(`${t.date}T00:00:00.000Z`)
      const endOfDay = new Date(`${t.date}T23:59:59.999Z`)

      const att = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })

      if (!att) {
        console.log(`No attendance found for Dwi on ${t.date}`)
        continue
      }

      if (!att.checkIn) {
        console.log(`Attendance ${att.id} on ${t.date} has no checkIn, skipping.`)
        continue
      }

      const oldCheckIn = new Date(att.checkIn)
      const oldLocal = oldCheckIn.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      })

      // Geser jam masuk 7 jam maju (untuk memperbaiki data lama yang masih offset)
      const newCheckIn = new Date(oldCheckIn.getTime() + t.shiftHours * 60 * 60 * 1000)
      const newLocal = newCheckIn.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      })

      await prisma.attendance.update({
        where: { id: att.id },
        data: { checkIn: newCheckIn }
      })

      console.log(
        `Updated Dwi ${t.date}: checkIn ${oldLocal} -> ${newLocal} (record id ${att.id})`
      )
    }

    console.log('Manual fix completed.')
  } catch (e) {
    console.error('Error in fix-dwi-feb-special:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()

