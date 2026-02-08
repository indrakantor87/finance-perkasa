const ZKLib = require('zkteco-js')

async function main() {
    let zk = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        // zkteco-js constructor: (ip, port, timeout, inport)
        zk = new ZKLib(ip, port, 10000, 4000)

        console.log('Connecting with zkteco-js...')
        await zk.createSocket()

        console.log('Fetching logs...')
        const logs = await zk.getAttendances()
        
        console.log('Raw Data Sample (Last 10 logs):')
        const data = logs.data || []
        const last10 = data.slice(-10)
        
        last10.forEach((log, index) => {
            console.log(`Log ${index + 1}:`, JSON.stringify(log, null, 2))
        })

    } catch (e) {
        console.error('Error:', e)
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
    }
}

main()
