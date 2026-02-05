import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, month, year, overrides, preview } = body

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 })
    }

    // Get Employee
    let employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      // Try finding by name
      const employees = await prisma.employee.findMany({
        where: { 
          name: {
            contains: employeeId
          }
        }
      })
      if (employees.length > 0) {
        employee = employees[0]
      }
    }

    if (!employee) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })
    }

    const foundEmployeeId = employee.id

    // --- CALCULATION LOGIC (Default) ---
    // Only calculate if overrides are NOT provided for a specific field
    
    // Get Attendance for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: foundEmployeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PRESENT',
      },
    })

    const presentDays = attendances.length
    const totalOvertimeHours = attendances.reduce(
      (sum: number, att: { overtimeHours: number }) => sum + att.overtimeHours,
      0
    )

    // Helper to use override or default
    const getVal = (key: string, defaultVal: number) => {
      return overrides && overrides[key] !== undefined ? Number(overrides[key]) : defaultVal
    }

    // 1. Kehadiran Absensi
    const baseSalary = getVal('baseSalary', employee.baseSalary)

    // Marketing Package Counts (for Base Salary calculation)
    const countHomeLite = getVal('countHomeLite', 0)
    const countHomeBasic = getVal('countHomeBasic', 0)
    const countHomeStream = getVal('countHomeStream', 0)
    const countHomeEntertain = getVal('countHomeEntertain', 0)
    const countHomeSmall = getVal('countHomeSmall', 0)
    const countHomeAdvan = getVal('countHomeAdvan', 0)

    // Calculate Base Salary for Marketing if specific counts are present or role is marketing
    const isMarketing = ['PENJUALAN', 'MARKETING'].some(d => employee!.department.toUpperCase().includes(d)) || 
                        ['MARKETING'].some(r => employee!.role.toUpperCase().includes(r))
    
    let calculatedBaseSalary = baseSalary
    
    if (isMarketing) {
        // Only override baseSalary calculation if counts are provided or if it's explicitly marketing context
        // If the user manually inputs "Gaji" (baseSalary), we respect it (handled by getVal above)
        // BUT, if the user inputs counts, we should probably update baseSalary accordingly?
        // The logic is: overrides.baseSalary takes precedence.
        // If overrides.baseSalary is NOT provided, we check if we should calculate it from packages.
        
        if (!overrides || overrides.baseSalary === undefined) {
            const rawTotal = (countHomeLite * 337800) +
                             (countHomeBasic * 150000) +
                             (countHomeStream * 180180) +
                             (countHomeEntertain * 234234) +
                             (countHomeSmall * 292793) +
                             (countHomeAdvan * 418919)
            
            calculatedBaseSalary = Math.round(rawTotal * 0.20)
        }
    }
    
    // Re-assign baseSalary if calculated (and not overridden)
    const finalBaseSalary = (isMarketing && (!overrides || overrides.baseSalary === undefined)) ? calculatedBaseSalary : baseSalary

    // 2. Transport (Example: 20,000 per day present)
    const transportAmount = getVal('transportAmount', presentDays * 20000)

    // 3. Overtime (Example: 25,000 per hour)
    const overtimeAmount = getVal('overtimeAmount', totalOvertimeHours * 25000)

    // 4. Tunjangan Jabatan
    let defaultPositionAllowance = 0
    // Check role loosely or strictly based on business logic
    if (['LEADER', 'MANAGER', 'ADMIN', 'SPV'].some(r => employee!.role.toUpperCase().includes(r))) {
        defaultPositionAllowance = employee.positionAllowance
    }
    const positionAllowance = getVal('positionAllowance', defaultPositionAllowance)

    // 5. Uang Makan
    const mealAllowance = getVal('mealAllowance', presentDays * 15000)

    // 6. BPJS
    const bpjsAllowance = getVal('bpjsAllowance', Math.round(finalBaseSalary * 0.02))

    // 7. Kinerja & Kedisiplinan
    const performanceBonus = getVal('performanceBonus', 0)
    const disciplineBonus = getVal('disciplineBonus', 0)

    // 8. Marketing Incentives (Default 0 unless overridden)
    const psbCount = getVal('psbCount', 0)
    const incentivePsb = getVal('incentivePsb', psbCount * 50000)
    const installationCount5k = getVal('installationCount5k', 0)
    const installationCount10k = getVal('installationCount10k', 0)
    const incentiveInstalasi = getVal('incentiveInstalasi', (installationCount5k * 5000) + (installationCount10k * 10000))
    const incentiveTagihan = getVal('incentiveTagihan', 0)
    const umtAmount = getVal('umtAmount', presentDays * 15000)

    // 9. Teknisi Incentives
    const newCustomerIncentive = getVal('newCustomerIncentive', 0)
    const clientFee = getVal('clientFee', 0)


    // --- DEDUCTIONS ---
    
    // 1. JHT
    const jhtDeduction = getVal('jhtDeduction', Math.round(finalBaseSalary * 0.01))

    // 2. Arisan
    const arisanDeduction = getVal('arisanDeduction', 0)

    // 3. BON / Loan (Active loans)
    let defaultLoanDeduction = 0
    if (!overrides || overrides.loanDeduction === undefined) {
      const loans = await prisma.loan.findMany({
          where: {
              employeeId: foundEmployeeId,
              status: 'ACTIVE'
          }
      })
      // Sum of monthly installments
      defaultLoanDeduction = loans.reduce(
        (sum: number, loan: { monthlyInstallment: number }) => sum + loan.monthlyInstallment,
        0
      )
    }
    const loanDeduction = getVal('loanDeduction', defaultLoanDeduction)

    // --- TOTALS ---
    const totalIncome = finalBaseSalary + transportAmount + overtimeAmount + performanceBonus + disciplineBonus + positionAllowance + bpjsAllowance + mealAllowance + incentivePsb + incentiveInstalasi + incentiveTagihan + umtAmount
    const totalDeduction = arisanDeduction + jhtDeduction + loanDeduction
    const netSalary = totalIncome - totalDeduction

    const resultData = {
      baseSalary: finalBaseSalary,
      transportAmount,
      overtimeHours: totalOvertimeHours,
      overtimeAmount,
      performanceBonus,
      disciplineBonus,
      positionAllowance,
      bpjsAllowance,
      mealAllowance,
      psbCount,
      incentivePsb,
      installationCount5k,
      installationCount10k,
      incentiveInstalasi,
      incentiveTagihan,
      umtAmount,
      newCustomerIncentive,
      clientFee,
      presentDays,
      countHomeLite,
      countHomeBasic,
      countHomeStream,
      countHomeEntertain,
      countHomeSmall,
      countHomeAdvan,
      arisanDeduction,
      jhtDeduction,
      loanDeduction,
      totalIncome,
      totalDeduction,
      netSalary,
    }

    if (preview) {
      return NextResponse.json({
        ...resultData,
        employee: {
            name: employee.name,
            role: employee.role,
            department: employee.department
        }
      })
    }

    // Save or Update Salary Slip
    const salarySlip = await prisma.salarySlip.upsert({
      where: {
        month_year_employeeId: {
          month: parseInt(month),
          year: parseInt(year),
          employeeId: foundEmployeeId,
        },
      },
      update: resultData,
      create: {
        month: parseInt(month),
        year: parseInt(year),
        employeeId: foundEmployeeId,
        ...resultData
      },
      include: {
        employee: true
      }
    })

    return NextResponse.json(salarySlip)
  } catch (error: any) {
    console.error('Salary generation error:', error)
    return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
  }
}
