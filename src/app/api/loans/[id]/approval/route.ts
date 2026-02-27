import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notification-service'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    // Validasi status
    if (!['ACTIVE', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // Cek Auth (Hanya Admin)
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('perkasa-finance-auth')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const isAdmin = ['ADMIN', 'DEVELOPER', 'ADMINISTRATOR'].includes(session.role)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cek Pinjaman
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Pinjaman tidak ditemukan' }, { status: 404 })
    }

    if (loan.status !== 'PENDING') {
      return NextResponse.json({ error: 'Pinjaman sudah diproses sebelumnya' }, { status: 400 })
    }

    // Update Status
    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: { status }
    })

    // Kirim Notifikasi
    const jenisLabel = loan.type === 'KASBON' ? 'Kasbon' : 'Pinjaman'
    const statusLabel = status === 'ACTIVE' ? 'DISETUJUI' : 'DITOLAK'
    const notifType = status === 'ACTIVE' ? 'success' : 'error' // 'error' biasanya merah, cocok untuk reject

    await createNotification(
      `Pengajuan ${jenisLabel} ${statusLabel}`,
      `Pengajuan ${jenisLabel} Anda sebesar Rp ${loan.amount.toLocaleString('id-ID')} telah ${statusLabel.toLowerCase()}.`,
      notifType,
      'loan'
    )

    return NextResponse.json(updatedLoan)
  } catch (error) {
    console.error('Error approving loan:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
