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
    
    zkInstance = new ZKLib(ip, port, timeout, 4000)
    
    // Create socket
    try {
        await zkInstance.createSocket()
    } catch (err) {
        console.error('[ZK] Create Socket Failed:', err)
        throw new Error('Failed to create socket: ' + err)
    }
    
    const users = await zkInstance.getUsers()

    const logs = await zkInstance.getAttendances()
    
    // Get device time
    let time = 'Unknown'
    try {
        time = await zkInstance.getTime()
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
              await zkInstance.disconnect()
          } catch (e) {
              console.error('[ZK] Disconnect error:', e)
          }
      }
  }
}
