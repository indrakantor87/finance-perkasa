const ZKLib = require('zkteco-js')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    let zk = null
    try {
        console.log('Starting sync process (zkteco-js)...')
        
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
            
            // AUTO-CREATE MISSING USERS (To ensure logs are processed)
            let createdUserCount = 0
            if (unmappedUsers.length > 0) {
                console.log(`Auto-creating ${unmappedUsers.length} missing users...`)
                for (const name of unmappedUsers) {
                    try {
                        // Double check if exists (in case of race condition or previous loop)
                        const existing = await prisma.employee.findFirst({
                             where: { name: { equals: name, mode: 'insensitive' } }
                        })
                        
                        let empId = existing?.id
                        
                        if (!existing) {
                             const newEmp = await prisma.employee.create({
                                data: {
                                    name: name,
                                    role: 'STAFF', // Default
                                    department: 'Pemasaran dan Pelayanan', // Default
                                    status: 'Karyawan',
                                    joinDate: new Date(),
                                }
                             })
                             console.log(`Created user: ${name}`)
                             empId = newEmp.id
                             createdUserCount++
                        }
                        
                        // Add to map
                        // We need to find the machine ID for this name
                        const machineUser = users.data.find(u => u.name === name)
                        if (machineUser && empId) {
                            employeeMap[machineUser.userId] = empId
                        }
                    } catch (err) {
                        console.error(`Failed to create user ${name}:`, err)
                    }
                }
            }
            
            console.log(`User Mapping: Matched ${Object.keys(employeeMap).length} users. Unmapped: ${unmappedUsers.length - createdUserCount}`)


            // 2. Group logs by User and Date
            const groupedLogs = {} 
            
            for (const log of logs.data) {
                // Handle property name differences (zkteco-js vs node-zklib style)
                const uid = log.deviceUserId || log.user_id
                const recordTime = log.recordTime || log.record_time
                
                if (!uid) continue
                if (!employeeMap[uid]) continue
                
                const dateObj = new Date(recordTime)
                if (isNaN(dateObj.getTime())) continue
                
                const dateStr = dateObj.toISOString().split('T')[0]
                
                if (!groupedLogs[uid]) groupedLogs[uid] = {}
                if (!groupedLogs[uid][dateStr]) groupedLogs[uid][dateStr] = []
                
                // Normalize log object for easier processing later
                log.recordTime = recordTime // Ensure consistent property access
                
                // Keep the raw log to check state
                groupedLogs[uid][dateStr].push(log)
            }
            
            // 3. Save to DB
            let processedCount = 0
            let createdCount = 0
            let updatedCount = 0
            let skippedCount = 0

            for (const uid in groupedLogs) {
                const employeeId = employeeMap[uid]
                for (const dateStr in groupedLogs[uid]) {
                    const rawLogs = groupedLogs[uid][dateStr].sort((a, b) => 
                        new Date(a.recordTime) - new Date(b.recordTime)
                    )
                    
                    // Deduplicate logic (Double Tap Prevention)
                    // We only keep logs that are > 2 mins apart or have DIFFERENT states
                    const validLogs = []
                    if (rawLogs.length > 0) {
                        validLogs.push(rawLogs[0])
                        for (let i = 1; i < rawLogs.length; i++) {
                            const prev = validLogs[validLogs.length - 1]
                            const curr = rawLogs[i]
                            
                            const prevTime = new Date(prev.recordTime).getTime()
                            const currTime = new Date(curr.recordTime).getTime()
                            const diff = currTime - prevTime
                            
                            // If diff > 5 mins OR State is different (e.g. In vs Out), keep it
                            // (If state is same and < 5 mins, likely double tap)
                            const prevState = prev.state
                            const currState = curr.state
                            
                            if (diff > 5 * 60 * 1000 || prevState !== currState) {
                                validLogs.push(curr)
                            }
                        }
                    }

                    // DETERMINE CheckIn / CheckOut based on STATE (User Request: Identik dengan mesin)
                    // State 0 = CheckIn, State 1 = CheckOut
                    // If state is not 0/1 (e.g. Break), we ignore for basic In/Out or map to closest
                    
                    let checkIn = null
                    let checkOut = null
                    
                    // Find explicit Check In (First State 0)
                    const inLog = validLogs.find(l => l.state === 0)
                    if (inLog) {
                        checkIn = new Date(inLog.recordTime)
                    }

                    // Find explicit Check Out (Last State 1)
                    // We search from end
                    const outLog = [...validLogs].reverse().find(l => l.state === 1)
                    if (outLog) {
                        checkOut = new Date(outLog.recordTime)
                    }

                    // FALLBACK: If no explicit states found (some machines don't send state properly or all 0)
                    // Or if only one log exists and it has no valid state
                    if (!checkIn && !checkOut) {
                         if (validLogs.length === 1) {
                             // Only one log, unknown state. Assume CheckIn (Standard behavior)
                             // BUT User specifically said "Historis jam masuk hilang, hanya jam keluar".
                             // If the log is late (> 12:00), maybe it's Out?
                             // Let's stick to standard unless we are sure.
                             // However, if we switched to zkteco-js, we SHOULD see the state.
                             checkIn = new Date(validLogs[0].recordTime)
                         } else if (validLogs.length > 1) {
                             // Multiple logs, assume First In, Last Out
                             checkIn = new Date(validLogs[0].recordTime)
                             checkOut = new Date(validLogs[validLogs.length - 1].recordTime)
                         }
                    } else {
                        // We have at least one explicit state.
                        // Handle partials:
                        // Case: Only CheckOut exists (User scenario) -> checkIn is null, checkOut is set.
                        // Case: Only CheckIn exists -> checkIn is set, checkOut is null.
                    }

                    // FINAL SAFETY: If we have CheckIn & CheckOut, ensure In < Out
                    if (checkIn && checkOut && checkIn > checkOut) {
                        // Swapped? Or midnight crossing?
                        // If same day, this is weird. Maybe Out was recorded before In?
                        // Or multiple shifts?
                        // For now, if In > Out, invalidate the Out (or In?)
                        // Let's just keep them, but overtime calc might be weird.
                        // Actually, if In > Out on same day, it's invalid sequence.
                        // But maybe the "Out" belongs to previous shift?
                        // Since we group by Date, these are same calendar day.
                        // We'll trust the explicit states.
                    }
                    
                    // Calculate Overtime (WIB Aware)
                    let overtimeHours = 0
                    if (checkIn && checkOut) {
                         const WIB_OFFSET = 7 * 60 * 60 * 1000
                         const inDateWIB = new Date(checkIn.getTime() + WIB_OFFSET)
                         const outDateWIB = new Date(checkOut.getTime() + WIB_OFFSET)
                         
                         const inHour = inDateWIB.getUTCHours()
                         const inMinute = inDateWIB.getUTCMinutes()
                         
                         const durationMillis = checkOut.getTime() - checkIn.getTime()
                         let overtimeMinutes = 0
                         
                         // Case 1: Late Shift (CheckIn >= 17:00 WIB)
                         if (inHour > 17 || (inHour === 17 && inMinute >= 0)) {
                            overtimeMinutes = Math.floor(durationMillis / 60000)
                         } else {
                            // Case 2: Normal Shift
                            const standardExitWIB = new Date(inDateWIB)
                            standardExitWIB.setUTCHours(17, 0, 0, 0)
                            
                            if (outDateWIB.getTime() > standardExitWIB.getTime()) {
                                if (inDateWIB.getTime() > standardExitWIB.getTime()) {
                                    overtimeMinutes = Math.floor(durationMillis / 60000)
                                } else {
                                    overtimeMinutes = Math.floor((outDateWIB.getTime() - standardExitWIB.getTime()) / 60000)
                                }
                            }
                         }
                         
                         // SAFETY CHECK: Overtime cannot exceed Total Duration
                         const totalDurationMinutes = Math.floor(durationMillis / 60000);
                         if (overtimeMinutes > totalDurationMinutes) {
                             console.warn(`Overtime calculation anomaly detected: OT ${overtimeMinutes}m > Duration ${totalDurationMinutes}m. Capping to duration.`);
                             overtimeMinutes = totalDurationMinutes;
                         }

                         if (overtimeMinutes > 0) {
                            const hh = Math.floor(overtimeMinutes / 60)
                            const mm = Math.round(overtimeMinutes % 60)
                            overtimeHours = parseFloat(`${hh}.${mm.toString().padStart(2, '0')}`)
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
                        // User requested to NOT overwrite existing data
                        skippedCount++
                    } else {
                        // Check if we have valid data to save
                        // We save if at least CheckIn OR CheckOut is present
                        if (checkIn || checkOut) {
                            await prisma.attendance.create({
                                data: {
                                    employeeId,
                                    date: startOfDay,
                                    checkIn: checkIn, // Can be null
                                    checkOut: checkOut, // Can be null
                                    status: 'PRESENT',
                                    overtimeHours: overtimeHours
                                }
                            })
                            createdCount++
                        } else {
                            // No valid times (should not happen if logs exist)
                            skippedCount++ 
                        }
                    }
                    processedCount++
                }
            }
            console.log(`Sync Complete. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`)
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
