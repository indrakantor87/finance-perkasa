import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const { main } = require('../../../../../scripts/sync-machine.js')
    const result = await main()

    return NextResponse.json({
      message: 'Sync successful',
      details: result || null
    })
  } catch (error: any) {
    return NextResponse.json({
      message: 'Sync failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
