
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.systemSetting.findFirst()

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.systemSetting.create({
        data: {
          companyName: 'PSB PERKASA',
          companyAddress: 'Jl. Raya Perusahaan No. 1',
          companyPhone: '0812-3456-7890',
          payrollCutoffDate: 25,
          defaultWorkDays: 26
        }
      })
    }

    return NextResponse.json(settings)
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
      defaultWorkDays 
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
        defaultWorkDays: parseInt(defaultWorkDays)
      }
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
