import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json()
    const { status } = body
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status }
    })
    
    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Update permission error:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await prisma.leaveRequest.delete({
      where: { id: params.id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete permission error:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}
