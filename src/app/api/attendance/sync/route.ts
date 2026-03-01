import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'

export async function POST() {
  try {
    // Validate machine config first to give clearer error
    const settings = await prisma.systemSetting.findFirst()
    const ip = settings?.machineIp
    const port = settings?.machinePort
    
    // Try to read machineDevices list (multi-device support)
    let devices: Array<{ name?: string; ip: string; port: number; enabled?: boolean }> = []
    try {
      const res = await prisma.$queryRawUnsafe('SELECT machineDevices FROM SystemSetting WHERE id = ? LIMIT 1', settings?.id || '') as any[]
      const raw = Array.isArray(res) && res[0] ? (res[0] as any).machineDevices : null
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) {
        devices = parsed.filter(d => d && d.ip && (d.enabled !== false))
      }
    } catch {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `machineDevices` JSON NULL')
      } catch {}
    }

    if ((!ip || !port || port <= 0) && devices.length === 0) {
      return NextResponse.json(
        {
          message: 'Sync failed',
          error: 'Konfigurasi mesin belum lengkap. Cek Master Data > Server Config (IP/Port).'
        },
        { status: 400 }
      )
    }

    // Load sync script and run
    const { main } = require('../../../../../scripts/sync-machine.js')

    // If multiple devices configured, run sequentially and aggregate
    if (devices.length > 0) {
      const summary: any[] = []
      let total = { processed: 0, created: 0, updated: 0, skipped: 0 }
      for (const dev of devices) {
        try {
          const res = await main({ ip: dev.ip, port: dev.port })
          summary.push({
            name: dev.name || `${dev.ip}:${dev.port}`,
            ...res
          })
          total.processed += res?.processedCount || 0
          total.created += res?.createdCount || 0
          total.updated += res?.updatedCount || 0
          total.skipped += res?.skippedCount || 0
        } catch (e: any) {
          summary.push({
            name: dev.name || `${dev.ip}:${dev.port}`,
            error: e?.message || String(e)
          })
        }
      }
      return NextResponse.json({
        message: 'Sync multiple devices finished',
        total,
        summary
      })
    }

    // Single device fallback
    const result = await main()

    return NextResponse.json({
      message: 'Sync successful',
      details: result || null
    })
  } catch (error: any) {
    const details = error?.message || String(error)
    return NextResponse.json({
      message: 'Sync failed',
      error: details
    }, { status: 500 })
  }
}
