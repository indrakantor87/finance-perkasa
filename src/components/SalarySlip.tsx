import React from 'react'

export interface SalarySlipData {
  baseSalary: number
  transportAmount: number
  overtimeHours: number
  overtimeAmount: number
  performanceBonus: number
  disciplineBonus: number
  positionAllowance: number
  healthAllowance?: number
  bpjsAllowance: number
  mealAllowance: number
  incentivePsb?: number
  psbCount?: number
  incentiveInstalasi?: number
  installationCount5k?: number
  installationCount10k?: number
  incentiveTagihan?: number
  umtAmount?: number
  presentDays?: number
  countHomeLite?: number
  countHomeBasic?: number
  countHomeStream?: number
  countHomeEntertain?: number
  countHomeSmall?: number
  countHomeAdvan?: number
  totalIncome: number
  arisanDeduction: number
  jhtDeduction: number
  loanDeduction: number
  totalDeduction: number
  netSalary: number
  newCustomerIncentive?: number
  clientFee?: number
  attendanceAllowance?: number
}

interface SalarySlipProps {
  data: SalarySlipData
  employeeName: string
  role: string
  department?: string
  month: number
  year: number
}

export function SalarySlip({ data, employeeName, role, department, month, year }: SalarySlipProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
  }

  const monthName = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' })
  const isMarketing = department === 'Penjualan' || department === 'Marketing' || role.includes('MARKETING') || (department && department.toLowerCase().includes('pemasaran'))

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 shadow-lg border border-gray-300 text-gray-900 font-serif print:w-full print:max-w-none print:shadow-none print:border-none print:p-0">
      <div className="text-center mb-1 border-b-2 border-double border-gray-800 pb-1 relative">
          {/* Header Image */}
          <img src="/images/header-banner.png" alt="Logo" className="w-full max-h-24 object-contain mx-auto mb-0" />
          <h1 className="text-xl font-bold uppercase tracking-wider mt-1">SLIP GAJI</h1>
      </div>

      <div className="mb-2 text-sm font-bold">
          <div className="grid grid-cols-[100px_10px_1fr] gap-1">
              <div>Bulan</div>
              <div>:</div>
              <div>{monthName} {year}</div>
              
              <div>Nama</div>
              <div>:</div>
              <div>{employeeName}</div>
              
              <div>Jabatan</div>
              <div>:</div>
              <div>{role}</div>
          </div>
      </div>

      <table className="w-full border-2 border-black mb-4 text-sm">
          <thead>
              <tr className="border-b-2 border-black">
                  <th className="text-left p-2 border-r-2 border-black w-1/2">Penghasilan</th>
                  <th className="text-center p-2">Rincian</th>
              </tr>
          </thead>
          <tbody>
              {isMarketing ? (
                /* Marketing Structure */
                <>
                    {data.attendanceAllowance > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Kehadiran Absensi</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.attendanceAllowance)}</td>
                        </tr>
                    )}
                    {data.baseSalary > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Gaji</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.baseSalary)}</td>
                        </tr>
                    )}
                    {data.incentivePsb > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">
                                Incentive PSB {data.psbCount ? `(${data.psbCount})` : ''}
                            </td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.incentivePsb)}</td>
                        </tr>
                    )}
                    {data.incentiveInstalasi > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">
                                Incentive instalasi {data.installationCount5k || data.installationCount10k ? `(${data.installationCount5k || 0} x 5k, ${data.installationCount10k || 0} x 10k)` : ''}
                            </td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.incentiveInstalasi)}</td>
                        </tr>
                    )}
                    {data.incentiveTagihan > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Incentive tagihan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.incentiveTagihan)}</td>
                        </tr>
                    )}
                    {data.umtAmount > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">UMT</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.umtAmount)}</td>
                        </tr>
                    )}
                    {data.positionAllowance > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Tunjangan Jabatan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.positionAllowance)}</td>
                        </tr>
                    )}
                    {data.overtimeAmount > 0 && (
                        <tr className="border-b-2 border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Overtime + Hari Libur</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.overtimeAmount)}</td>
                        </tr>
                    )}
                    {(data.healthAllowance ?? 0) > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Tunjangan Kesehatan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.healthAllowance!)}</td>
                        </tr>
                    )}
                    {data.bpjsAllowance > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">BPJS Ketenagakerjaan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.bpjsAllowance)}</td>
                        </tr>
                    )}
                    {data.transportAmount > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Transport</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.transportAmount)}</td>
                        </tr>
                    )}
                    {data.disciplineBonus > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Kedisiplinan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.disciplineBonus)}</td>
                        </tr>
                    )}
                </>
              ) : (
                /* Non-Marketing Structure */
                <>
                    <tr className="border-b border-black">
                        <td className="p-1 pl-2 border-r-2 border-black">Kehadiran Absensi</td>
                        <td className="p-1 pr-2 text-right">{formatCurrency(data.baseSalary)}</td>
                    </tr>
                    {data.performanceBonus > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Kinerja</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.performanceBonus)}</td>
                        </tr>
                    )}
                    <tr className="border-b border-black">
                        <td className="p-1 pl-2 border-r-2 border-black">Kedisiplinan</td>
                        <td className="p-1 pr-2 text-right">{formatCurrency(data.disciplineBonus)}</td>
                    </tr>
                    {data.transportAmount > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Transport</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.transportAmount)}</td>
                        </tr>
                    )}
                    {data.mealAllowance > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Uang Makan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.mealAllowance)}</td>
                        </tr>
                    )}
                    <tr className="border-b border-black">
                        <td className="p-1 pl-2 border-r-2 border-black">Tunjangan Jabatan</td>
                        <td className="p-1 pr-2 text-right">{formatCurrency(data.positionAllowance)}</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                        <td className="p-1 pl-2 border-r-2 border-black">Overtime + Hari Libur</td>
                        <td className="p-1 pr-2 text-right">{formatCurrency(data.overtimeAmount)}</td>
                    </tr>
                    {(data.healthAllowance ?? 0) > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">Tunjangan Kesehatan</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.healthAllowance!)}</td>
                        </tr>
                    )}
                    {data.bpjsAllowance > 0 && (
                        <tr className="border-b border-black">
                            <td className="p-1 pl-2 border-r-2 border-black">{['Teknisi', 'Support Management', 'Management'].includes(department || '') ? 'BPJS Ketenagakerjaan' : 'Tunjangan Kesehatan/ BPJS Ketenagakerjaan'}</td>
                            <td className="p-1 pr-2 text-right">{formatCurrency(data.bpjsAllowance)}</td>
                        </tr>
                    )}
                </>
              )}
              
              {/* TOTAL INCOME */}
              <tr className="border-b border-black font-black">
                  <td className="p-1 pl-2 border-r-2 border-black">TOTAL PENGHASILAN</td>
                  <td className="p-1 pr-2 text-right">{formatCurrency(data.totalIncome)}</td>
              </tr>
              
              {/* DEDUCTIONS */}
              {data.arisanDeduction > 0 && (
                  <tr className="border-b border-black font-bold">
                      <td className="p-1 pl-2 border-r-2 border-black">Arisan</td>
                      <td className="p-1 pr-2 text-right">{formatCurrency(data.arisanDeduction)}</td>
                  </tr>
              )}
              {data.jhtDeduction > 0 && (
                  <tr className="border-b border-black font-bold">
                      <td className="p-1 pl-2 border-r-2 border-black">Potongan JHT</td>
                      <td className="p-1 pr-2 text-right">{formatCurrency(data.jhtDeduction)}</td>
                  </tr>
              )}
              {data.loanDeduction > 0 && (
                  <tr className="border-b border-black font-bold">
                      <td className="p-1 pl-2 border-r-2 border-black">BON</td>
                      <td className="p-1 pr-2 text-right">{formatCurrency(data.loanDeduction)}</td>
                  </tr>
              )}

              {/* TOTAL DITERIMA */}
              <tr className="font-black text-lg bg-gray-100 print:bg-gray-100" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
                  <td className="p-1 pl-2 border-r-2 border-black">TOTAL DITERIMA</td>
                  <td className="p-1 pr-2 text-right">{formatCurrency(data.netSalary)}</td>
              </tr>
          </tbody>
      </table>

      <div className="mt-4 flex justify-end text-center font-bold text-sm px-8">
          <div className="flex flex-col items-center relative">
              <div className="mb-[-15px] relative z-10">DIREKTUR</div>
              <div className="relative w-32 h-20 flex items-center justify-center">
                  {/* Signature Layer */}
                  <img src="/images/ttd.png" alt="Signature" className="absolute top-0 left-0 w-full h-full object-contain scale-75" />
                  {/* Stamp Layer (On Top) */}
                  <img src="/uploads/stempel.png" alt="Stamp" className="absolute top-0 left-0 w-full h-full object-contain opacity-80 -rotate-12 scale-110" />
              </div>
              <div className="mt-[-15px] relative z-10">DARNO</div>
          </div>
          {/* Recipient Signature - Hidden for Marketing style match, but can be enabled if needed */}
          {/* 
          <div className="flex flex-col items-center gap-16">
              <div>PENERIMA</div>
              <div>( ........................... )</div>
          </div> 
          */}
      </div>
    </div>
  )
}
