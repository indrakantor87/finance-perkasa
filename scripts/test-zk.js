const ZKLib = require('zkteco-js')

async function test() {
    let zkInstance = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        const timeout = 10000

        console.log(`[ZK] Attempting to connect to ${ip}:${port}...`)
        
        zkInstance = new ZKLib(ip, port, timeout, 4000)
        
        await zkInstance.createSocket()
        console.log('[ZK] Socket created successfully')
        
        // Users
        const users = await zkInstance.getUsers()
        console.log(`[ZK] Users found: ${users?.data?.length}`)
        if (users?.data?.length > 0) {
            console.log('Sample Users (First 3):', users.data.slice(0, 3))
        }
        
        // Logs
        const logs = await zkInstance.getAttendances()
        console.log(`[ZK] Logs found: ${logs?.data?.length}`)
        
        if (logs?.data?.length > 0) {
            console.log('First Log:', logs.data[0])
            console.log('Last Log:', logs.data[logs.data.length - 1])
            
            // Find a valid log
            const validLog = logs.data.find(l => l.deviceUserId || l.user_id)
            console.log('First Valid Log found:', validLog)
            
            // Check keys
            console.log('Log Keys:', Object.keys(logs.data[0]))
        }
        
        const time = await zkInstance.getTime()
        console.log(`[ZK] Device time: ${time}`)
        
    } catch (e) {
        console.error('[ZK] Error:', e)
    } finally {
        if (zkInstance) {
            try {
                await zkInstance.disconnect()
                console.log('[ZK] Disconnected')
            } catch (e) {
                console.error('[ZK] Disconnect error:', e)
            }
        }
    }
}

test()