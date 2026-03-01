import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findFirst()
    if (!settings) {
      return NextResponse.json({
        allowances: {
          'DIREKTUR': 0,
          'GENERAL MANAGER': 0,
          'MANAGER': 0,
          'SPV': 0,
          'LEADER': 0,
          'STAFF': 0
        },
        baseSalaries: {
          'DIREKTUR': 0,
          'GENERAL MANAGER': 0,
          'MANAGER': 0,
          'SPV': 0,
          'LEADER': 0,
          'STAFF': 0
        },
      })
    }

    let result: any[] = []
    try {
      result = await prisma.$queryRawUnsafe(
        'SELECT jobCategoryAllowances, jobCategoryBaseSalaries FROM SystemSetting WHERE id = ? LIMIT 1',
        settings.id as any
      ) as any[]
    } catch {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `jobCategoryAllowances` JSON NULL')
      } catch {}
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `jobCategoryBaseSalaries` JSON NULL')
      } catch {}
      return NextResponse.json({
        allowances: {
          'DIREKTUR': 0,
          'GENERAL MANAGER': 0,
          'MANAGER': 0,
          'SPV': 0,
          'LEADER': 0,
          'STAFF': 0
        },
        baseSalaries: {
          'DIREKTUR': 0,
          'GENERAL MANAGER': 0,
          'MANAGER': 0,
          'SPV': 0,
          'LEADER': 0,
          'STAFF': 0
        },
      })
    }

    const row = Array.isArray(result) && result[0] ? result[0] as any : null
    const rawAllow = row ? row.jobCategoryAllowances : null
    const rawBase = row ? row.jobCategoryBaseSalaries : null
    const parsedAllow = typeof rawAllow === 'string' ? JSON.parse(rawAllow) : rawAllow
    const parsedBase = typeof rawBase === 'string' ? JSON.parse(rawBase) : rawBase
    return NextResponse.json({
      allowances: parsedAllow || {
        'DIREKTUR': 0,
        'GENERAL MANAGER': 0,
        'MANAGER': 0,
        'SPV': 0,
        'LEADER': 0,
        'STAFF': 0
      },
      baseSalaries: parsedBase || {
        'DIREKTUR': 0,
        'GENERAL MANAGER': 0,
        'MANAGER': 0,
        'SPV': 0,
        'LEADER': 0,
        'STAFF': 0
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load allowances' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const allowances = body?.allowances || {}
    const baseSalaries = body?.baseSalaries || {}

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

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `jobCategoryAllowances` JSON NULL')
    } catch {}
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `SystemSetting` ADD COLUMN `jobCategoryBaseSalaries` JSON NULL')
    } catch {}

    const json = JSON.stringify(allowances || {})
    const jsonBase = JSON.stringify(baseSalaries || {})
    await prisma.$executeRawUnsafe(`UPDATE \`SystemSetting\` SET \`jobCategoryAllowances\` = '${json.replace(/'/g, "''")}', \`jobCategoryBaseSalaries\` = '${jsonBase.replace(/'/g, "''")}' WHERE id = '${settings.id}'`)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save allowances' }, { status: 500 })
  }
}
