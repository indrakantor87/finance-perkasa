import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST() {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-machine.js')
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
        // Try to parse the output for counts
        const match = stdout.match(/Sync Complete\. Processed: (\d+), Created: (\d+), Updated: (\d+)/)
        const mappingMatch = stdout.match(/User Mapping: Matched (\d+) users\. Unmapped: (\d+)/)
        const unmappedNamesMatch = stdout.match(/Unmapped Names: (.*)/)

        let details = {}
        if (match) {
            details = {
                processed: parseInt(match[1]),
                created: parseInt(match[2]),
                updated: parseInt(match[3]),
                unmappedCount: mappingMatch ? parseInt(mappingMatch[2]) : 0,
                unmappedNames: unmappedNamesMatch ? unmappedNamesMatch[1] : ''
            }
        }
        
        resolve(NextResponse.json({ 
            message: 'Sync successful', 
            details,
            logs: stdout
        }))
      } else {
        resolve(NextResponse.json({ 
            message: 'Sync failed', 
            error: stderr || 'Unknown error',
            logs: stdout
        }, { status: 500 }))
      }
    })
  })
}
