import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const { main } = require('../../../../../scripts/clear-machine-logs.js')
    await main()
    return NextResponse.json({
      status: 'success',
      message: 'Log absensi mesin berhasil dihapus.'
    })
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      message: e?.message || 'Gagal menghapus log mesin.'
    }, { status: 500 })
  }
}
