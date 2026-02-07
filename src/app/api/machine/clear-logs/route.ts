import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST() {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'clear-machine-logs.js')
    const child = spawn('node', [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ 
            status: 'success',
            message: 'Log absensi mesin berhasil dihapus.', 
            logs: stdout
        }))
      } else {
        resolve(NextResponse.json({ 
            status: 'error',
            message: 'Gagal menghapus log mesin.', 
            error: stderr || 'Unknown error',
            logs: stdout
        }, { status: 500 }))
      }
    })
  })
}
