
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.systemSetting.findFirst()

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          companyName: 'PSB PERKASA',
          companyAddress: 'Jl. Raya Perusahaan No. 1',
          companyPhone: '0812-3456-7890',
          payrollCutoffDate: 25,
          defaultWorkDays: 26,
          machineIp: '103.162.16.14',
          machinePort: 4370
        }
      })
    }

    let machineDevices: any = []
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT machineDevices FROM SystemSetting WHERE id = ? LIMIT 1', settings.id as any) as any[]
      const raw = Array.isArray(rows) && rows[0] ? (rows[0] as any).machineDevices : null
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) machineDevices = parsed
    } catch {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `machineDevices` JSON NULL')
      } catch {}
    }

    return NextResponse.json({ ...settings, machineDevices })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { 
      id, 
      companyName, 
      companyAddress, 
      companyPhone, 
      companyEmail,
      payrollCutoffDate, 
      defaultWorkDays,
      machineIp,
      machinePort,
      machineDevices
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Settings ID required' }, { status: 400 })
    }

    const updatedSettings = await prisma.systemSetting.update({
      where: { id },
      data: {
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        payrollCutoffDate: parseInt(payrollCutoffDate),
        defaultWorkDays: parseInt(defaultWorkDays),
        machineIp,
        machinePort: parseInt(machinePort)
      }
    })

    if (machineDevices) {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `machineDevices` JSON NULL')
      } catch {}
      const json = JSON.stringify(machineDevices || [])
      await prisma.$executeRawUnsafe(`UPDATE \`SystemSetting\` SET \`machineDevices\` = '${json.replace(/'/g, "''")}' WHERE id = '${id}'`)
    }

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
