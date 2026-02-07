const ZKLib = require('node-zklib')
const fs = require('fs')
const path = require('path')

async function main() {
    let zk = null
    try {
        console.log('Starting clear logs process...')
        
        // Setup connection
        const ip = '103.162.16.14'
        const port = 4370
        zk = new ZKLib(ip, port, 20000, 4000)

        console.log(`Connecting to ${ip}:${port}...`)
        await zk.createSocket()
        console.log('Connected.')

        // Check log count before clearing
        let logCount = 0
        try {
            const info = await zk.getInfo()
            logCount = info.logCounts
            console.log(`Current Log Count: ${logCount}`)
        } catch (e) {
            console.log('Could not get info, proceeding anyway.')
        }

        if (logCount > 0) {
            console.log('Backing up logs before clearing...')
            try {
                // Fetch logs for backup
                const logs = await zk.getAttendances()
                if (logs && logs.data && logs.data.length > 0) {
                    const backupDir = path.join(__dirname, '..', 'storage', 'backups')
                    if (!fs.existsSync(backupDir)) {
                        fs.mkdirSync(backupDir, { recursive: true })
                    }
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                    const filename = `machine_logs_backup_${timestamp}_${logs.data.length}records.json`
                    const filepath = path.join(backupDir, filename)
                    
                    fs.writeFileSync(filepath, JSON.stringify(logs.data, null, 2))
                    console.log(`Backup saved to: ${filepath}`)
                } else {
                    console.log('No logs fetched for backup (empty data).')
                }
            } catch (backupError) {
                console.error('Backup failed:', backupError.message)
                console.log('WARNING: Proceeding to clear logs WITHOUT backup? (No, aborting for safety)')
                // Abort if backup fails to prevent data loss
                throw new Error('Backup failed. Aborting clear process to protect data.')
            }
        }

        console.log('Clearing attendance logs...')
        await zk.clearAttendanceLog()
        console.log('Logs cleared successfully.')

        // Verify
        try {
            const info = await zk.getInfo()
            console.log(`New Log Count: ${info.logCounts}`)
        } catch (e) {}

    } catch (e) {
        console.error('Clear Error:', e.message)
        process.exit(1)
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
        console.log('Exiting process.')
    }
}

main()
