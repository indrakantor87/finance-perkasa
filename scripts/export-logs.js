const ZKLib = require('zkteco-js')

async function exportLogs(options = {}) {
    let zk = null
    try {
        const ip = '103.162.16.14'
        const port = 4370
        zk = new ZKLib(ip, port, 20000, 4000)

        await zk.createSocket()

        const logs = await zk.getAttendances()

        let data = logs?.data || []

        const envTargetIds = process.env.TARGET_USER_IDS ? process.env.TARGET_USER_IDS.split(',') : []
        const optionIds = Array.isArray(options.userIds) ? options.userIds.map(String) : []
        const targetIds = optionIds.length > 0 ? optionIds : envTargetIds

        if (targetIds.length > 0) {
            data = data.filter(l => targetIds.includes(String(l.user_id)))
        }

        return { status: 'success', data }
    } catch (e) {
        console.error(e)
        if (options.throwOnError) {
            throw e
        }
        return { status: 'error', message: e.message }
    } finally {
        if (zk) {
            try {
                await zk.disconnect()
            } catch (e) {}
        }
    }
}

async function main() {
    const result = await exportLogs()
    console.log(JSON.stringify(result))
}

if (require.main === module) {
    main().catch(() => {
        process.exit(1)
    })
}

module.exports = { exportLogs }
