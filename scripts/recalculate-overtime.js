const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting overtime recalculation...')
    
    const attendances = await prisma.attendance.findMany({
        where: {
            checkOut: { not: null }
        }
    })
    
    console.log(`Found ${attendances.length} records with CheckOut.`)
    
    let updatedCount = 0
    
    for (const att of attendances) {
        if (!att.checkOut) continue
        
        // Determine reference date (Shift Start Date)
        // If CheckIn exists, use it. Else use CheckOut date.
        const refDate = att.checkIn ? new Date(att.checkIn) : new Date(att.checkOut)
        
        // Limit Time: 17:00 WIB = 10:00 UTC
        const limitTime = new Date(refDate)
        limitTime.setUTCHours(10, 0, 0, 0) 
        
        let newOvertime = 0
        
        // Rule: Overtime if CheckOut > 17:00
        if (att.checkOut > limitTime) {
            let startTime = limitTime
            
            // If CheckIn is later than 17:00 (Late Shift), count from CheckIn
            if (att.checkIn && att.checkIn > limitTime) {
                startTime = att.checkIn
            }
            
            const durationMin = (att.checkOut.getTime() - startTime.getTime()) / 60000
            if (durationMin > 0) {
                const h = Math.floor(durationMin / 60)
                const m = Math.round(durationMin % 60)
                newOvertime = parseFloat(`${h}.${m.toString().padStart(2, '0')}`)
            }
        }
        
        // Update if different
        if (Math.abs(att.overtimeHours - newOvertime) > 0.01) {
            // console.log(`ID ${att.id} (${att.date.toISOString().split('T')[0]}): ${att.overtimeHours} -> ${newOvertime}`)
            await prisma.attendance.update({
                where: { id: att.id },
                data: { overtimeHours: newOvertime }
            })
            updatedCount++
        }
    }
    
    console.log(`Recalculation complete. Updated ${updatedCount} records.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
