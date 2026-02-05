import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { mkdir } from 'fs/promises'

export async function POST(request: Request) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // Sanitize filename
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
    const finalName = `${uniqueSuffix}-${filename}`
    
    const uploadDir = path.join(process.cwd(), 'public/uploads')
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {
      // Ignore if exists
    }
    
    const filepath = path.join(uploadDir, finalName)
    
    await writeFile(filepath, buffer)
    
    return NextResponse.json({ success: true, url: `/uploads/${finalName}` })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}
