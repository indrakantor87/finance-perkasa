const ZKLib = require('node-zklib')

async function main() {
    let zk = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        // Increase timeout
        zk = new ZKLib(ip, port, 20000, 4000)

        await zk.createSocket()

        // Get logs
        const timeoutMs = 120000 
        let logs = { data: [] }
        
        const fetchPromise = zk.getAttendances()
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Fetch timeout (${timeoutMs}ms)`)), timeoutMs)
        )
        
        logs = await Promise.race([fetchPromise, timeoutPromise])
        
        // Filter if IDs provided in env
        let data = logs?.data || []
        
        // Ensure deviceUserId is used (node-zklib usually returns deviceUserId or user_id)
        // Let's normalize
        data = data.map(l => ({
            ...l,
            deviceUserId: l.deviceUserId || l.user_id, // Normalize
        }))

        const targetIds = process.env.TARGET_USER_IDS ? process.env.TARGET_USER_IDS.split(',') : []
        
        if (targetIds.length > 0) {
            data = data.filter(l => targetIds.includes(String(l.deviceUserId)))
        }

        console.log(JSON.stringify({ status: 'success', data }))

    } catch (e) {
        console.error(e)
        console.log(JSON.stringify({ status: 'error', message: e.message }))
        process.exit(1)
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
    }
}

main()
