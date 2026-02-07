const ZKLib = require('node-zklib')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    let zk = null
    try {
        console.log('Starting sync process...')
        
        // Setup connection
        const ip = '103.162.16.14'
        const port = 4370
        // Increase timeout for slow connections
        zk = new ZKLib(ip, port, 20000, 4000)

        console.log(`Connecting to ${ip}:${port}...`)
        await zk.createSocket()
        console.log('Connected.')

        // Get Machine Info (Log Count)
        let logCount = 0
        let logCapacity = 0
        try {
            const info = await zk.getInfo()
            logCount = info.logCounts
            logCapacity = info.logCapacity
            console.log(`Machine Info: ${logCount} logs / ${logCapacity} capacity`)
        } catch (e) {
            console.error('Failed to get machine info:', e)
        }

        // Get Users
        console.log('Fetching users...')
        const users = await zk.getUsers()
        console.log(`Fetched ${users?.data?.length || 0} users.`)

        // Early exit if no logs
        if (logCount === 0) {
            console.log('No logs on machine. Sync skipped.')
            await zk.disconnect()
            return
        }

        // Fetch Logs with Timeout
        console.log('Fetching attendance logs...')
        let logs = { data: [] }
        
        // Define a max time based on log count (e.g., 1000 logs = 1 sec?)
        // 63k logs might take 60s+
        const timeoutMs = 60000 
        
        try {
            const fetchPromise = zk.getAttendances()
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Fetch timeout (${timeoutMs}ms). Data too large?`)), timeoutMs)
            )
            
            logs = await Promise.race([fetchPromise, timeoutPromise])
            console.log(`Fetched ${logs?.data?.length || 0} logs.`)
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            console.error('Failed to fetch logs:', errorMsg)
            
            // Log full error for debugging
            try {
                // Check if it's a ZKError (has .err property)
                if (err && err.err) {
                    console.error('Underlying ZK Error:', err.err)
                    if (err.err.code) console.error('Error Code:', err.err.code)
                    if (err.err.message) console.error('Error Message:', err.err.message)
                }
                
                console.error('Full Error Details:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
            } catch (jsonErr) {
                console.error('Could not stringify error:', jsonErr)
            }

            if (logCount > 10000) {
                console.log(`SUGGESTION: The machine has ${logCount} logs. Please clear old logs manually to enable sync.`)
                throw new Error(`Gagal mengambil data. Mesin memiliki ${logCount} log (Terlalu banyak). Harap hapus log lama di mesin.`)
            }
            throw err
        }
        
        if (!logs?.data?.length) {
            console.log('No logs to process.')
        }

        // Process logs if any
        if (logs?.data?.length) {
             // 1. Map Machine User ID to Employee ID (via Name)
            const employees = await prisma.employee.findMany()
            const employeeMap = {} // machineUserId -> prismaEmployeeId
            const unmappedUsers = []
            
            if (users?.data) {
                for (const u of users.data) {
                    // Match by name (insensitive)
                    const emp = employees.find(e => e.name.toLowerCase() === u.name.toLowerCase())
                    if (emp) {
                        employeeMap[u.userId] = emp.id
                    } else {
                        unmappedUsers.push(u.name)
                    }
                }
            }
            
            console.log(`User Mapping: Matched ${Object.keys(employeeMap).length} users. Unmapped: ${unmappedUsers.length}`)
            if (unmappedUsers.length > 0) {
                console.log(`Unmapped Names: ${unmappedUsers.slice(0, 10).join(', ')}${unmappedUsers.length > 10 ? '...' : ''}`)
            }

            // 2. Group logs by User and Date
            const groupedLogs = {} 
            
            for (const log of logs.data) {
                const uid = log.user_id || log.deviceUserId // Try both
                if (!employeeMap[uid]) continue
                
                const dateObj = new Date(log.recordTime)
                if (isNaN(dateObj.getTime())) continue
                
                const dateStr = dateObj.toISOString().split('T')[0]
                
                if (!groupedLogs[uid]) groupedLogs[uid] = {}
                if (!groupedLogs[uid][dateStr]) groupedLogs[uid][dateStr] = []
                
                groupedLogs[uid][dateStr].push(dateObj)
            }
            
            // 3. Save to DB
            let processedCount = 0
            let createdCount = 0
            let updatedCount = 0

            for (const uid in groupedLogs) {
                const employeeId = employeeMap[uid]
                for (const dateStr in groupedLogs[uid]) {
                    const times = groupedLogs[uid][dateStr].sort((a, b) => a - b)
                    
                    const checkIn = times[0]
                    const checkOut = times.length > 1 ? times[times.length - 1] : null
                    
                    let overtimeHours = 0
                    if (checkOut) {
                        const outH = checkOut.getHours()
                        const outM = checkOut.getMinutes()
                        
                        // Rule: Overtime if CheckOut > 17:00
                        if (outH > 17 || (outH === 17 && outM > 0)) {
                            const limitTime = new Date(checkOut)
                            limitTime.setHours(17, 0, 0, 0)
                            
                            // If checkIn is after 17:00 (Late Shift), count from checkIn
                            // Otherwise count from 17:00
                            let startTime = limitTime
                            if (checkIn && checkIn > limitTime) {
                                startTime = checkIn
                            }

                            const durMin = (checkOut - startTime) / 60000
                            if (durMin > 0) {
                                const hh = Math.floor(durMin / 60)
                                const mm = Math.round(durMin % 60)
                                overtimeHours = parseFloat(`${hh}.${mm.toString().padStart(2, '0')}`)
                            }
                        }
                    }

                    const startOfDay = new Date(dateStr)
                    startOfDay.setHours(0,0,0,0)
                    const endOfDay = new Date(dateStr)
                    endOfDay.setHours(23,59,59,999)

                    const existing = await prisma.attendance.findFirst({
                        where: {
                            employeeId,
                            date: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    })

                    if (existing) {
                        await prisma.attendance.update({
                            where: { id: existing.id },
                            data: {
                                checkIn: checkIn,
                                checkOut: checkOut,
                                overtimeHours: overtimeHours
                            }
                        })
                        updatedCount++
                    } else {
                        await prisma.attendance.create({
                            data: {
                                employeeId,
                                date: startOfDay,
                                checkIn: checkIn,
                                checkOut: checkOut,
                                status: 'PRESENT',
                                overtimeHours: overtimeHours
                            }
                        })
                        createdCount++
                    }
                    processedCount++
                }
            }
            console.log(`Sync Complete. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}`)
        }

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.error('Sync Error:', errorMsg)
        // Ensure non-zero exit code for error
        process.exit(1)
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
        await prisma.$disconnect()
    }
}

main()
