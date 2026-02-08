import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const maxDuration = 120; // Allow longer timeout for fetching logs

export async function POST(req: Request) {
  try {
    const { userIds } = await req.json(); // userIds (string[]) to filter
    
    return new Promise((resolve) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'export-logs.js');
        
        const env = { 
            ...process.env,
            TARGET_USER_IDS: userIds && userIds.length > 0 ? userIds.join(',') : ''
        };

        const child = spawn('node', [scriptPath], {
            cwd: process.cwd(),
            env
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    // Find the JSON part in stdout (it might contain other logs)
                    // We look for the last valid JSON line or try to parse the whole thing if clean
                    // But our script does console.log(JSON.stringify) at the end.
                    // Let's try to parse the last line or find { status: ... }
                    
                    const lines = stdout.trim().split('\n');
                    let jsonData = null;
                    
                    // Try to parse from the end
                    for (let i = lines.length - 1; i >= 0; i--) {
                        try {
                            const parsed = JSON.parse(lines[i]);
                            if (parsed.status) {
                                jsonData = parsed;
                                break;
                            }
                        } catch (e) {}
                    }

                    if (jsonData && jsonData.status === 'success') {
                         resolve(NextResponse.json({
                            status: 'success',
                            data: jsonData.data
                        }));
                    } else {
                         resolve(NextResponse.json({
                            status: 'error',
                            message: jsonData?.message || 'Failed to parse script output',
                            logs: stdout
                        }, { status: 500 }));
                    }

                } catch (e: any) {
                    resolve(NextResponse.json({
                        status: 'error',
                        message: 'JSON Parse Error: ' + e.message,
                        logs: stdout
                    }, { status: 500 }));
                }
            } else {
                resolve(NextResponse.json({
                    status: 'error',
                    message: 'Script failed with code ' + code,
                    error: stderr,
                    logs: stdout
                }, { status: 500 }));
            }
        });
    });

  } catch (error: any) {
    console.error('Export Logs Error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
