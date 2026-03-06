const ZKLib = require('zkteco-js')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

function parseMachineTime(recordTime) {
    if (!recordTime) return null
    if (recordTime instanceof Date) return recordTime
    if (typeof recordTime === 'number') {
        const d = new Date(recordTime)
        return isNaN(d.getTime()) ? null : d
    }

    const s = String(recordTime).trim()
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}

async function main(opts) {
    let zk = null
    try {
        console.log('Starting sync process (zkteco-js)...')
        
        // Fetch settings
        const settings = await prisma.systemSetting.findFirst()
        const ip = (opts && opts.ip) || settings?.machineIp || '103.162.16.14'
        const port = (opts && opts.port) || settings?.machinePort || 4370

        // Setup connection
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
        const usersRes = await zk.getUsers()
        const usersData = Array.isArray(usersRes) ? usersRes : (usersRes?.data || [])
        console.log(`Fetched ${usersData.length} users.`)

        // Jangan early-exit hanya berdasarkan getInfo; beberapa perangkat gagal melaporkan logCount
        // Tetap lanjut ambil log dengan getAttendances()

        // Fetch Logs with Timeout
        console.log('Fetching attendance logs...')
        let logsRes = { data: [] }
        
        // Define a max time based on log count (e.g., 1000 logs = 1 sec?)
        // 63k logs might take 60s+
        const timeoutMs = 60000 
        
        try {
            const fetchPromise = zk.getAttendances()
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Fetch timeout (${timeoutMs}ms). Data too large?`)), timeoutMs)
            )
            
            logsRes = await Promise.race([fetchPromise, timeoutPromise])
            const logsDataTmp = Array.isArray(logsRes) ? logsRes : (logsRes?.data || [])
            console.log(`Fetched ${logsDataTmp.length} logs.`)
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
        
        const logsData = Array.isArray(logsRes) ? logsRes : (logsRes?.data || [])
        if (!logsData.length) {
            console.log('No logs to process. Returning empty result.')
            return { processedCount: 0, createdCount: 0, updatedCount: 0, skippedCount: 0, reason: 'No logs on machine' }
        }

        // Process logs if any
        if (logsData.length) {
             // 1. Map Machine User ID to Employee ID (via Name)
            const employees = await prisma.employee.findMany()
            const employeeMap = {} // machineUserId -> prismaEmployeeId
            const unmappedUsers = []
            
            if (usersData && usersData.length) {
                for (const u of usersData) {
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
                        
                        const machineUsersForName = usersData.filter(u => u.name === name)
                        for (const mu of machineUsersForName) {
                            if (empId) {
                                employeeMap[mu.userId] = empId
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to create user ${name}:`, err)
                    }
                }
            }
            
            console.log(`User Mapping: Matched ${Object.keys(employeeMap).length} users. Unmapped: ${unmappedUsers.length - createdUserCount}`)


            // 2. Group logs by User and Date
            const groupedLogs = {} 
            let debugCount = 0
            
            for (const log of logsData) {
                // Handle property name differences (zkteco-js vs node-zklib style)
                const uid = log.deviceUserId || log.user_id
                const rawRecordTime = log.recordTime || log.record_time
                
                if (!uid) continue
                if (!employeeMap[uid]) continue
                
                const dateObj = parseMachineTime(rawRecordTime)
                if (!dateObj || isNaN(dateObj.getTime())) continue

                if (debugCount < 20) {
                    console.log('DEBUG_MACHINE_TIME', {
                        rawRecordTime,
                        typeofRaw: typeof rawRecordTime,
                        parsedISO: dateObj.toISOString(),
                        parsedLocal: dateObj.toString(),
                        serverNow: new Date().toString(),
                        serverISO: new Date().toISOString(),
                        envTZ: process.env.TZ || null,
                    })
                    debugCount++
                }
                
                const dateWIB = new Date(dateObj.getTime() + WIB_OFFSET_MS)
                const dateStr = dateWIB.toISOString().split('T')[0]
                
                if (!groupedLogs[uid]) groupedLogs[uid] = {}
                if (!groupedLogs[uid][dateStr]) groupedLogs[uid][dateStr] = []
                
                // Normalize log object for easier processing later
                log.recordTime = dateObj // Ensure consistent property access
                
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
                const dateKeys = Object.keys(groupedLogs[uid])
                const minDateStr = dateKeys.reduce((a, b) => (a < b ? a : b))
                const maxDateStr = dateKeys.reduce((a, b) => (a > b ? a : b))
                const minDate = new Date(`${minDateStr}T00:00:00.000Z`)
                const maxDate = new Date(`${maxDateStr}T23:59:59.999Z`)
                const existingList = await prisma.attendance.findMany({
                    where: {
                        employeeId,
                        date: { gte: minDate, lte: maxDate }
                    },
                    select: { id: true, date: true, checkIn: true, checkOut: true }
                })
                const existingMap = new Map()
                for (const ex of existingList) {
                    const ds = new Date(ex.date).toISOString().split('T')[0]
                    existingMap.set(ds, ex)
                }
                let ops = []
                for (const dateStr of dateKeys) {
                    const rawLogs = groupedLogs[uid][dateStr].sort((a, b) => a.recordTime - b.recordTime)
                    const validLogs = []
                    if (rawLogs.length > 0) {
                        validLogs.push(rawLogs[0])
                        for (let i = 1; i < rawLogs.length; i++) {
                            const prev = validLogs[validLogs.length - 1]
                            const curr = rawLogs[i]
                            const prevTime = prev.recordTime.getTime()
                            const currTime = curr.recordTime.getTime()
                            const diff = currTime - prevTime
                            const prevState = prev.state
                            const currState = curr.state
                            if (diff > 5 * 60 * 1000 || prevState !== currState) {
                                validLogs.push(curr)
                            } else {
                                validLogs[validLogs.length - 1] = curr
                            }
                        }
                    }
                    let checkIn = null
                    let checkOut = null
                    const inLog = validLogs.find(l => l.state === 0)
                    if (inLog) checkIn = new Date(inLog.recordTime)
                    const outLog = [...validLogs].reverse().find(l => l.state === 1)
                    if (outLog) checkOut = new Date(outLog.recordTime)
                    if (!checkIn && !checkOut) {
                        if (validLogs.length === 1) {
                            checkIn = new Date(validLogs[0].recordTime)
                        } else if (validLogs.length > 1) {
                            checkIn = new Date(validLogs[0].recordTime)
                            checkOut = new Date(validLogs[validLogs.length - 1].recordTime)
                        }
                    } else {
                        if (checkIn && !checkOut && validLogs.length > 1) {
                            const lastLog = validLogs[validLogs.length - 1]
                            if (lastLog?.recordTime && lastLog.recordTime.getTime() !== checkIn.getTime()) {
                                checkOut = new Date(lastLog.recordTime)
                            }
                        }
                    }
                    if (checkIn && checkOut && checkIn.getTime() === checkOut.getTime()) {
                        checkOut = null
                    }
                    let overtimeHours = 0
                    if (checkIn && checkOut) {
                        const WIB_OFFSET = 7 * 60 * 60 * 1000
                        const inDateWIB = new Date(checkIn.getTime() + WIB_OFFSET)
                        let outDateWIB = new Date(checkOut.getTime() + WIB_OFFSET)
                        const inHour = inDateWIB.getUTCHours()
                        const inMinute = inDateWIB.getUTCMinutes()
                        if (outDateWIB.getTime() <= inDateWIB.getTime() && (inHour > 17 || (inHour === 17 && inMinute >= 0))) {
                            outDateWIB = new Date(outDateWIB.getTime() + 24 * 60 * 60 * 1000)
                        }
                        const durationMillis = outDateWIB.getTime() - inDateWIB.getTime()
                        const totalDurationMinutes = Math.floor(durationMillis / 60000)
                        let overtimeMinutes = 0
                        if (totalDurationMinutes > 0) {
                            const WORK_MINUTES = 9 * 60
                            if (inHour > 17 || (inHour === 17 && inMinute >= 0)) {
                                const regularEndWIB = new Date(inDateWIB.getTime() + WORK_MINUTES * 60000)
                                if (outDateWIB.getTime() > regularEndWIB.getTime()) {
                                    overtimeMinutes = Math.floor((outDateWIB.getTime() - regularEndWIB.getTime()) / 60000)
                                }
                            } else {
                                const standardExitWIB = new Date(inDateWIB)
                                standardExitWIB.setUTCHours(17, 0, 0, 0)
                                if (outDateWIB.getTime() > standardExitWIB.getTime()) {
                                    overtimeMinutes = Math.floor((outDateWIB.getTime() - standardExitWIB.getTime()) / 60000)
                                }
                            }
                            if (overtimeMinutes > totalDurationMinutes) overtimeMinutes = totalDurationMinutes
                            if (overtimeMinutes > 0) {
                                const hh = Math.floor(overtimeMinutes / 60)
                                const mm = Math.round(overtimeMinutes % 60)
                                overtimeHours = parseFloat(`${hh}.${mm.toString().padStart(2, '0')}`)
                            }
                        }
                    }
                    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
                    const ex = existingMap.get(dateStr)
                    if (ex) {
                        const finalCheckIn = checkIn || ex.checkIn
                        const finalCheckOut = checkOut || ex.checkOut
                        let updateData = {}
                        if (checkIn) updateData.checkIn = checkIn
                        if (checkOut) updateData.checkOut = checkOut
                        if (finalCheckIn && finalCheckOut) {
                            const WIB_OFFSET = 7 * 60 * 60 * 1000
                            const inDateWIB = new Date(finalCheckIn.getTime() + WIB_OFFSET)
                            let outDateWIB = new Date(finalCheckOut.getTime() + WIB_OFFSET)
                            const inHour = inDateWIB.getUTCHours()
                            const inMinute = inDateWIB.getUTCMinutes()
                            if (outDateWIB.getTime() <= inDateWIB.getTime() && (inHour > 17 || (inHour === 17 && inMinute >= 0))) {
                                outDateWIB = new Date(outDateWIB.getTime() + 24 * 60 * 60 * 1000)
                            }
                            const dur = outDateWIB.getTime() - inDateWIB.getTime()
                            const totalDur = Math.floor(dur / 60000)
                            let otMin = 0
                            if (totalDur > 0) {
                                const WORK_MINUTES = 9 * 60
                                if (inHour > 17 || (inHour === 17 && inMinute >= 0)) {
                                    const regularEndWIB = new Date(inDateWIB.getTime() + WORK_MINUTES * 60000)
                                    if (outDateWIB.getTime() > regularEndWIB.getTime()) {
                                        otMin = Math.floor((outDateWIB.getTime() - regularEndWIB.getTime()) / 60000)
                                    }
                                } else {
                                    const stdExit = new Date(inDateWIB)
                                    stdExit.setUTCHours(17, 0, 0, 0)
                                    if (outDateWIB.getTime() > stdExit.getTime()) {
                                        otMin = Math.floor((outDateWIB.getTime() - stdExit.getTime()) / 60000)
                                    }
                                }
                                if (otMin > totalDur) otMin = totalDur
                                if (otMin > 0) {
                                    const h = Math.floor(otMin / 60)
                                    const m = Math.round(otMin % 60)
                                    updateData.overtimeHours = parseFloat(`${h}.${m.toString().padStart(2, '0')}`)
                                } else {
                                    updateData.overtimeHours = 0
                                }
                            }
                        }
                        if (Object.keys(updateData).length > 0) {
                            ops.push(prisma.attendance.update({ where: { id: ex.id }, data: updateData }))
                            updatedCount++
                        } else {
                            skippedCount++
                        }
                    } else {
                        if (checkIn || checkOut) {
                            ops.push(prisma.attendance.create({
                                data: {
                                    employeeId,
                                    date: startOfDay,
                                    checkIn: checkIn || null,
                                    checkOut: checkOut || null,
                                    status: 'PRESENT',
                                    overtimeHours: overtimeHours
                                }
                            }))
                            createdCount++
                        } else {
                            skippedCount++
                        }
                    }
                    processedCount++
                    if (ops.length >= 50) {
                        await prisma.$transaction(ops)
                        ops = []
                    }
                }
                if (ops.length > 0) {
                    await prisma.$transaction(ops)
                }
            }
            console.log(`Sync Complete. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`)
            return { processedCount, createdCount, updatedCount, skippedCount }
        }

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.error('Sync Error:', errorMsg)
        throw e
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
        await prisma.$disconnect()
    }
}

async function cli() {
    try {
        await main()
    } catch (e) {
        process.exit(1)
    }
}

if (require.main === module) {
    cli()
}

module.exports = { main }
