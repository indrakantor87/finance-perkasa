const ZKLib = require('zkteco-js')

async function main() {
    let zk = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        // zkteco-js: ip, port, timeout, inport
        zk = new ZKLib(ip, port, 20000, 4000)

        // Create socket
        await zk.createSocket()

        // Get logs
        const logs = await zk.getAttendances()
        
        // logs.data structure in zkteco-js:
        // { sn, user_id, record_time, type, state, ip }

        let data = logs?.data || []
        
        // Filter if IDs provided in env
        const targetIds = process.env.TARGET_USER_IDS ? process.env.TARGET_USER_IDS.split(',') : []
        
        if (targetIds.length > 0) {
            data = data.filter(l => targetIds.includes(String(l.user_id)))
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
