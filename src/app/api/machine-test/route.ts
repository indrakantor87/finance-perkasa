import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  let zkInstance: any = null
  
  try {
    // Dynamic require to avoid build-time issues and ensure runtime execution
    const ZKLib = require('zkteco-js')
    
    const ip = '103.162.16.14'
    const port = 4370
    const timeout = 10000 // 10 seconds

    console.log(`[ZK] Attempting to connect to ${ip}:${port}...`)
    
    zkInstance = new ZKLib(ip, port, timeout, 4000)
    
    // Create socket
    try {
        await zkInstance.createSocket()
        console.log('[ZK] Socket created successfully')
    } catch (err) {
        console.error('[ZK] Create Socket Failed:', err)
        throw new Error('Failed to create socket: ' + err)
    }
    
    console.log('[ZK] Getting users...')
    const users = await zkInstance.getUsers()
    console.log(`[ZK] Users found: ${users?.data?.length}`)

    console.log('[ZK] Getting logs...')
    const logs = await zkInstance.getAttendances()
    console.log(`[ZK] Logs found: ${logs?.data?.length}`)
    
    // Get device time
    let time = 'Unknown'
    try {
        time = await zkInstance.getTime()
        console.log(`[ZK] Device time: ${time}`)
    } catch (e) {
        console.warn('[ZK] Failed to get time:', e)
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Connected to device',
      deviceTime: time,
      usersCount: users?.data?.length || 0,
      logsCount: logs?.data?.length || 0,
      sampleUsers: users?.data?.slice(0, 5),
      sampleLogs: logs?.data?.slice(logs?.data?.length - 5) // Show last 5 logs
    })
    
  } catch (error: any) {
    console.error('[ZK] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to device',
      error: error.message || error
    }, { status: 500 })
  } finally {
      if (zkInstance) {
          try {
              console.log('[ZK] Disconnecting...')
              await zkInstance.disconnect()
              console.log('[ZK] Disconnected')
          } catch (e) {
              console.error('[ZK] Disconnect error:', e)
          }
      }
  }
}
