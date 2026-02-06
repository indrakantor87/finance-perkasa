const ZKLib = require('node-zklib')

async function test() {
    let zk = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        console.log(`[Node-ZK] Connecting to ${ip}:${port}...`)
        
        zk = new ZKLib(ip, port, 10000, 4000)
        
        // Create socket
        await zk.createSocket()
        console.log('[Node-ZK] Socket created')
        
        // Get Users
        console.log('[Node-ZK] Getting users...')
        const users = await zk.getUsers()
        console.log(`[Node-ZK] Users: ${users?.data?.length || users?.length}`)
        
        // Get Logs
        console.log('[Node-ZK] Getting logs...')
        const logs = await zk.getAttendances()
        console.log(`[Node-ZK] Logs: ${logs?.data?.length || logs?.length}`)
        
    } catch (e) {
        console.error('[Node-ZK] Error:', e)
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
                console.log('[Node-ZK] Disconnected')
            } catch (e) {}
        }
    }
}

test()
